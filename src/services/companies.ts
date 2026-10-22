import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database,Json } from '@/types/database';
import { z } from 'zod';
import { companyDataSchema,ieResultSchema,type CompanyLookup,type CompanyHistory } from '@/types/company';
import { companyProviders } from '@/services/providers';
import { ProviderError, type CompanyProvider,type StateRegistrationProvider } from '@/services/providers/types';
import { ApiError } from '@/lib/api';

type Client=SupabaseClient<Database>;
type Providers={company:CompanyProvider;ie:StateRegistrationProvider};
export async function lookupCompany(supabase:Client,userId:string,cnpj:string,refresh=false,providers:Providers=companyProviders()):Promise<CompanyLookup> {
  const cached=await supabase.from('companies').select('id,data,ie_result,queried_at,expires_at').eq('user_id',userId).eq('cnpj',cnpj).maybeSingle();
  if(cached.error)throw cached.error;
  const cachedCompany=companyDataSchema.safeParse(cached.data?.data);
  const cachedIe=ieResultSchema.safeParse(cached.data?.ie_result);
  const cache=cached.data && cachedCompany.success && cachedIe.success ? {id:cached.data.id,company:cachedCompany.data,ie:cachedIe.data,queriedAt:cached.data.queried_at,expiresAt:cached.data.expires_at,fromCache:true,stale:new Date(cached.data.expires_at).getTime()<=Date.now()} : null;
  async function log(fromCache:boolean,outcome:string,companyId?:string){
    const {error}=await supabase.from('cnpj_queries').insert({user_id:userId,company_id:companyId,cnpj,provider:providers.company.name,from_cache:fromCache,outcome});
    if(error)throw error;
  }
  if(cache && !cache.stale && !refresh){await log(true,'success',cache.id);return cache;}
  let company;
  try {company=await providers.company.lookup(cnpj);}
  catch(error){
    const known=error instanceof ProviderError;
    // Only transport/unavailability failures may fall back. A 404 must not masquerade as current data.
    if(cache && known && error.code==='unavailable'){
      await log(true,'stale_fallback',cache.id);
      return {...cache,stale:true,warning:'Não foi possível atualizar na fonte. Exibindo a consulta anterior, que pode estar desatualizada.'};
    }
    await log(false,known ? error.code : 'failed',cache?.id);
    if(known)throw new ApiError(error.code==='not_found' ? 404 : 503,error.message,`PROVIDER_${error.code.toUpperCase()}`);
    throw error;
  }
  const ie=await providers.ie.lookup(cnpj,company.address.uf);
  const parsedIe=ieResultSchema.parse(ie);
  const {data,error}=await supabase.rpc('save_company_query',{p_cnpj:cnpj,p_company:company as unknown as Json,p_ie:parsedIe as unknown as Json,p_ttl_seconds:86400});
  if(error)throw error;
  const saved=z.object({id:z.uuid(),queriedAt:z.string(),expiresAt:z.string()}).parse(data);
  return {...saved,company,ie:parsedIe,fromCache:false,stale:false};
}
export async function listCompanies(supabase:Client,userId:string,query='',page=1,favorites=false):Promise<CompanyHistory>{
  const pageSize=10;
  // Only letters/numbers/spaces enter PostgREST OR syntax. Wildcards and delimiters are removed.
  const search=query.normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,'').trim().slice(0,80);
  let request=supabase.from('companies').select('id,cnpj,legal_name,trade_name,registration_status,queried_at,expires_at,is_favorite',{count:'exact'}).eq('user_id',userId);
  if(search)request=request.or(`legal_name.ilike.%${search}%,trade_name.ilike.%${search}%,cnpj.ilike.%${search}%`);
  if(favorites)request=request.eq('is_favorite',true);
  const {data,error,count}=await request.order('queried_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);
  if(error)throw error;
  return {items:data,page,total:count || 0,pageSize};
}
