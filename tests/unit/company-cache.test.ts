import { describe,expect,it,vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { lookupCompany } from '@/services/companies';
import { normalizeBrasilApi } from '@/services/providers/brasil-api';
import { ManualStateRegistrationProvider,unavailableIe } from '@/services/providers/state-registration';
import { ProviderError } from '@/services/providers/types';

const cnpj='00000000000191',id='a0000000-0000-4000-8000-000000000001';
const company=normalizeBrasilApi({cnpj,razao_social:'Fixture de cache'},cnpj);
function setup(expired=false,existing=true){
  const cached={id,data:company,ie_result:unavailableIe(),queried_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+(expired ? -1000 : 60000)).toISOString()};
  const insert=vi.fn().mockResolvedValue({error:null});
  const chain={select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn().mockResolvedValue({data:existing ? cached : null,error:null})};
  chain.select.mockReturnValue(chain);chain.eq.mockReturnValue(chain);
  const rpc=vi.fn().mockResolvedValue({data:{id,queriedAt:cached.queried_at,expiresAt:new Date(Date.now()+86400000).toISOString()},error:null});
  const client={from:vi.fn((table:string)=>table==='companies' ? chain : {insert}),rpc} as unknown as SupabaseClient<Database>;
  const lookup=vi.fn().mockResolvedValue(company);
  const providers={company:{name:'fixture',lookup},ie:new ManualStateRegistrationProvider()};
  return {client,providers,lookup,insert,rpc};
}
describe('cache cadastral',()=>{
  it('reutiliza cache válido, registra consulta e evita chamada externa',async()=>{
    const s=setup();const result=await lookupCompany(s.client,id,cnpj,false,s.providers);
    expect(result.fromCache).toBe(true);expect(result.stale).toBe(false);expect(s.lookup).not.toHaveBeenCalled();
    expect(s.insert).toHaveBeenCalledWith(expect.objectContaining({from_cache:true,outcome:'success'}));
  });
  it.each([true,false])('atualiza sob solicitação explícita; cache expirado=%s',async(expired)=>{
    const s=setup(expired);const result=await lookupCompany(s.client,id,cnpj,true,s.providers);
    expect(result.fromCache).toBe(false);expect(s.lookup).toHaveBeenCalledOnce();expect(s.rpc).toHaveBeenCalledOnce();
  });
  it('busca na fonte quando cache expira',async()=>{
    const s=setup(true);expect((await lookupCompany(s.client,id,cnpj,false,s.providers)).fromCache).toBe(false);
  });
  it('sinaliza dados anteriores se atualização falhar por indisponibilidade',async()=>{
    const s=setup(true);s.lookup.mockRejectedValue(new ProviderError('unavailable','Fonte indisponível'));
    const result=await lookupCompany(s.client,id,cnpj,false,s.providers);
    expect(result.stale).toBe(true);expect(result.warning).toContain('desatualizada');expect(s.rpc).not.toHaveBeenCalled();
  });
  it('não disfarça 404 com registro antigo',async()=>{
    const s=setup(true);s.lookup.mockRejectedValue(new ProviderError('not_found','Não encontrado'));
    await expect(lookupCompany(s.client,id,cnpj,false,s.providers)).rejects.toMatchObject({status:404});
    expect(s.insert).toHaveBeenCalledWith(expect.objectContaining({outcome:'not_found',from_cache:false}));
  });
  it('não inventa resultado se não há cache nem fonte disponível',async()=>{
    const s=setup(false,false);s.lookup.mockRejectedValue(new ProviderError('unavailable','Fonte indisponível'));
    await expect(lookupCompany(s.client,id,cnpj,false,s.providers)).rejects.toMatchObject({status:503});
  });
});
