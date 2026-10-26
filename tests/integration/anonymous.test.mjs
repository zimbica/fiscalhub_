import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Integração somente com Supabase local.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
test('identidades anônimas preservam isolamento e revogação', async t=>{
 const ids=[];
 try {
  const first=createClient(url,key,options), second=createClient(url,key,options);
  const a=await first.auth.signInAnonymously({options:{data:{full_name:'Mesmo apelido',role:'admin'}}});
  assert.equal(a.error,null); ids.push(a.data.user.id);
  const b=await second.auth.signInAnonymously({options:{data:{full_name:'Mesmo apelido'}}});
  assert.equal(b.error,null); ids.push(b.data.user.id);
  await t.test('apelidos iguais produzem IDs diferentes e não concedem papel admin',async()=>{
   assert.notEqual(ids[0],ids[1]); assert.equal(a.data.user.is_anonymous,true);
   assert.equal((await first.from('profiles').select('role').single()).data.role,'user');
  });
  await t.test('sessão só lê e altera o próprio perfil',async()=>{
   assert.equal((await first.rpc('has_active_session')).data,true);
   assert.deepEqual((await second.from('profiles').select('id').eq('id',ids[0])).data,[]);
   assert.deepEqual((await second.from('profiles').update({full_name:'Invadido'}).eq('id',ids[0]).select()).data,[]);
   assert.equal((await first.from('profiles').select('full_name').single()).data.full_name,'Mesmo apelido');
  });
  await t.test('exclusão invalida acesso com token ainda não expirado',async()=>{
   const stale=createClient(url,key,{...options,global:{headers:{Authorization:`Bearer ${a.data.session.access_token}`}}});
   assert.equal((await admin.auth.admin.deleteUser(ids[0])).error,null);
   assert.equal((await stale.rpc('has_active_session')).data,false);
   assert.deepEqual((await stale.from('profiles').select('id')).data,[]);
  });
 } finally { for(const id of ids) await admin.auth.admin.deleteUser(id); }
});
