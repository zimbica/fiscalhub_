import { z } from 'zod';
import { requireUser } from '@/lib/auth/session';
import { ApiError,assertSameOrigin,failure,readBody,success } from '@/lib/api';
import { rateLimit } from '@/services/rate-limit';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:Context){
  try{
    assertSameOrigin(request);const {supabase,user}=await requireUser();
    const {id}=await context.params;if(!z.uuid().safeParse(id).success)throw new ApiError(400,'Identificador inválido.');
    await rateLimit(request,'company-favorite',30,60,user.id);
    const body=await readBody(request,z.object({favorite:z.boolean()}));
    const {data,error}=await supabase.from('companies').update({is_favorite:body.favorite}).eq('id',id).eq('user_id',user.id).select('id,is_favorite').maybeSingle();
    if(error)throw error;if(!data)throw new ApiError(404,'Consulta não encontrada.');return success(data);
  }catch(error){return failure(error);}
}
export async function DELETE(request:Request,context:Context){
  try{
    assertSameOrigin(request);const {supabase,user}=await requireUser();
    const {id}=await context.params;if(!z.uuid().safeParse(id).success)throw new ApiError(400,'Identificador inválido.');
    await rateLimit(request,'company-delete',30,60,user.id);
    const {data,error}=await supabase.from('companies').delete().eq('id',id).eq('user_id',user.id).select('id').maybeSingle();
    if(error)throw error;if(!data)throw new ApiError(404,'Consulta não encontrada.');return success({message:'Empresa e consultas associadas removidas da sua conta.'});
  }catch(error){return failure(error);}
}
