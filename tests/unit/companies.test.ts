import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCnpj, isValidCnpj, normalizeCnpj } from '@/lib/cnpj';
import { BrasilApiProvider, normalizeBrasilApi } from '@/services/providers/brasil-api';
import { AuthorizedIeProvider, ManualStateRegistrationProvider } from '@/services/providers/state-registration';
import { ieResultSchema, lookupSchema } from '@/types/company';
import { providerJson } from '@/services/providers/fetch-json';

const cnpj='00000000000191';
// Synthetic provider fixture, never seeded into the application or production database.
const payload={cnpj,razao_social:'Empresa de teste',descricao_situacao_cadastral:'ATIVA',uf:'DF',opcao_pelo_simples:false,regime_tributario:[{ano:2023,forma_de_tributacao:'LUCRO REAL'}],qsa:[{nome_socio:'Não deve ser armazenado'}]};
const source={name:'Fonte de teste',url:'https://example.org/cadastro',retrievedAt:'2026-10-22T12:00:00Z'};
afterEach(()=>vi.unstubAllGlobals());

describe('CNPJ numérico e alfanumérico',()=>{
  it.each(['00.000.000/0001-91','00000000000191','12.ABC.345/01DE-35','12abc34501de35'])('valida %s pelo algoritmo de DV da Receita',value=>expect(isValidCnpj(value)).toBe(true));
  it.each(['00000000000000','11111111111111','00000000000192','12ABC34501DE34','12ABC34501DE3A','00000000000191<script>','123'])('recusa %s',value=>expect(isValidCnpj(value)).toBe(false));
  it('normaliza e formata sem perder letras',()=>{
    expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(formatCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35');
    expect(formatCnpj('00000000000191')).toBe('00.000.000/0001-91');
    expect(lookupSchema.parse({cnpj:'00.000.000/0001-91'})).toEqual({cnpj,refresh:false});
  });
});

describe('integração BrasilAPI',()=>{
  it('normaliza campos opcionais, preserva ano do regime e descarta quadro societário',()=>{
    const result=normalizeBrasilApi(payload,cnpj,new Date(source.retrievedAt));
    expect(result.legalName).toBe('Empresa de teste');expect(result.tradeName).toBeNull();
    expect(result.taxRegimes).toEqual([{year:2023,regime:'LUCRO REAL'}]);
    expect(result.simpleOption).toBe(false);expect(result.datasetUpdatedAt).toBeNull();
    expect(result.fieldSources.legalName.url).toContain(cnpj);
    expect(JSON.stringify(result)).not.toContain('nome_socio');
  });
  it('não aceita resposta de outra empresa nem resposta incompleta',()=>{
    expect(()=>normalizeBrasilApi({...payload,cnpj:'12345678000195'},cnpj)).toThrow(/incompatíveis/);
    expect(()=>normalizeBrasilApi({cnpj},cnpj)).toThrow(/incompatíveis/);
  });
  it('consulta endpoint real por contrato, com timeout e sem redirecionamento',async()=>{
    const fetcher=vi.fn().mockResolvedValue(Response.json(payload));vi.stubGlobal('fetch',fetcher);
    expect((await new BrasilApiProvider().lookup(cnpj)).cnpj).toBe(cnpj);
    expect(fetcher).toHaveBeenCalledWith(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,expect.objectContaining({cache:'no-store',redirect:'error',signal:expect.any(AbortSignal)}));
  });
  it.each([[404,'not_found'],[400,'unsupported'],[503,'unavailable']])('traduz HTTP %s sem inventar dados',async(status,code)=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:Number(status)})));
    await expect(new BrasilApiProvider().lookup(cnpj)).rejects.toMatchObject({code});
  });
  it('trata timeout e limita respostas excessivas',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new DOMException('Timeout','TimeoutError')));
    await expect(providerJson('https://example.org')).rejects.toMatchObject({code:'unavailable'});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({huge:'x'.repeat(1_048_576)})));
    await expect(providerJson('https://example.org')).rejects.toMatchObject({code:'invalid_response'});
  });
});

describe('IE separada da situação do CNPJ',()=>{
  it('não infere IE quando nenhum provedor está configurado',async()=>{
    expect(await new ManualStateRegistrationProvider().lookup()).toMatchObject({outcome:'unavailable',registrations:[],source:null});
  });
  it('aceita múltiplas inscrições com fontes e situações independentes',async()=>{
    const data={outcome:'verified',message:'Dados de teste',source,registrations:[{uf:'SP',registration:'fixture-sp',status:'active',verified:true,source},{uf:'RS',registration:'fixture-rs',status:'suspended',verified:true,source}]};
    const fetcher=vi.fn().mockResolvedValue(Response.json(data));vi.stubGlobal('fetch',fetcher);
    const result=await new AuthorizedIeProvider('https://example.org/api','test-token').lookup(cnpj,'DF');
    expect(result).toEqual(data);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining(`cnpj=${cnpj}&uf=DF`),expect.objectContaining({headers:{Authorization:'Bearer test-token'}}));
  });
  it('diferencia ausência confirmada de indisponibilidade',()=>{
    expect(ieResultSchema.safeParse({outcome:'not_found',registrations:[],message:'Sem resultados',source}).success).toBe(true);
    expect(ieResultSchema.safeParse({outcome:'not_found',registrations:[],message:'Sem resultados',source:null}).success).toBe(false);
  });
  it('recusa confirmação sem fonte e URL executável',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({outcome:'verified',source:null,registrations:[],message:'Ativa'})));
    expect((await new AuthorizedIeProvider('https://example.org/api','test-token').lookup(cnpj,null)).outcome).toBe('unavailable');
    expect(ieResultSchema.safeParse({outcome:'not_found',registrations:[],message:'Teste',source:{...source,url:'javascript:alert(1)'}}).success).toBe(false);
  });
  it('mantém situação não verificada quando a fonte falha',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Network')));
    expect((await new AuthorizedIeProvider('https://example.org/api','test-token').lookup(cnpj,null)).outcome).toBe('unavailable');
  });
});
