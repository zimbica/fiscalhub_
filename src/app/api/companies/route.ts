import { requireUser } from '@/lib/auth/session';
import { assertSameOrigin,readBody,success,failure } from '@/lib/api';
import { lookupSchema } from '@/types/company';
import { rateLimit } from '@/services/rate-limit';
import { listCompanies,lookupCompany } from '@/services/companies';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
  try{
    assertSameOrigin(request);const {supabase,user}=await requireUser();
    const {cnpj,refresh}=await readBody(request,lookupSchema);
    await rateLimit(request,'cnpj',10,60,user.id);
    await rateLimit(request,'cnpj-daily',120,86400,user.id);
    if(refresh)await rateLimit(request,'cnpj-refresh',5,60,user.id);
    return success(await lookupCompany(supabase,user.id,cnpj,refresh));
  }catch(error){return failure(error);}
}
export async function GET(request:Request){
  try{
    const {supabase,user}=await requireUser();
    const params=new URL(request.url).searchParams;
    const page=Math.min(10000,Math.max(1,parseInt(params.get('page') || '1') || 1));
    return success(await listCompanies(supabase,user.id,params.get('q') || '',page,params.get('favorites')==='true'));
  }catch(error){return failure(error);}
}
