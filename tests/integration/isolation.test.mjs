import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Testes de integração exigem Supabase LOCAL. Não executam em produção.');
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret=process.env.SUPABASE_SECRET_KEY;
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,secret,options);
const anonymous=createClient(url,key,options);
const password=`Teste-${randomUUID()}!`;

test('isolamento real com Supabase Auth, Postgres e Storage', async (t) => {
  const ids=[];
  const clients=[];
  const accessKey='1'.repeat(44);
  const files=[];
  try {
    for (const label of ['alice','bob']) {
      const email=`${label}-${randomUUID()}@example.test`;
      const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`Pessoa ${label}`,role:'admin'}});
      assert.equal(error,null);
      ids.push(data.user.id);
      const client=createClient(url,key,options);
      const login=await client.auth.signInWithPassword({email,password});
      assert.equal(login.error,null);
      clients.push(client);
    }
    const [alice,bob]=clients;
    const [aliceId,bobId]=ids;
    let documentId;
    await t.test('cadastro cria perfil e preferências; user_metadata não concede admin',async () => {
      const {data,error}=await alice.from('profiles').select('*');
      assert.equal(error,null); assert.equal(data.length,1); assert.equal(data[0].id,aliceId); assert.equal(data[0].role,'user');
      const settings=await alice.from('user_settings').select('*').single();
      assert.equal(settings.data.accent,'blue');
      assert.equal((await alice.rpc('has_active_session')).data,true);
    });
    await t.test('anônimo não lê dados privados nem executa funções privilegiadas',async () => {
      assert.ok((await anonymous.from('profiles').select('*')).error);
      assert.ok((await anonymous.rpc('consume_rate_limit',{p_key:'a'.repeat(64),p_limit:10,p_window_seconds:60})).error);
    });
    await t.test('usuário não lê nem altera o perfil de outro',async () => {
      const read=await bob.from('profiles').select('*').eq('id',aliceId);
      assert.deepEqual(read.data,[]);
      const write=await bob.from('profiles').update({full_name:'Intruso'}).eq('id',aliceId).select();
      assert.deepEqual(write.data,[]);
      assert.equal((await alice.from('profiles').select('full_name').single()).data.full_name,'Pessoa alice');
    });
    await t.test('bloqueia elevação de privilégio e troca de proprietário',async () => {
      assert.ok((await alice.from('profiles').update({role:'admin'}).eq('id',aliceId)).error);
      assert.ok((await alice.from('user_settings').update({user_id:bobId}).eq('user_id',aliceId)).error);
      assert.ok((await alice.from('activity_events').insert({user_id:aliceId,action:'fake'})).error);
    });
    await t.test('salva preferências reais e registra alteração',async () => {
      assert.equal((await alice.from('user_settings').update({theme:'dark',accent:'purple'}).eq('user_id',aliceId)).error,null);
      assert.equal((await alice.from('user_settings').select('accent').single()).data.accent,'purple');
      const history=await alice.from('activity_events').select('action').eq('action','preferences_updated');
      assert.equal(history.data.length,1);
    });
    const document={user_id:aliceId,access_key:accessKey,model:'55',layout_version:'4.00',number:'1',series:'1',issued_at:'2026-01-01T12:00:00Z',issuer_tax_id:'00000000000000',environment:'2',total_value:'10.29'};
    await t.test('armazena documento com decimal e situação não confirmada',async () => {
      const {data,error}=await alice.from('fiscal_documents').insert(document).select().single();
      assert.equal(error,null);documentId=data.id;assert.equal(data.status,'unconfirmed');assert.equal(data.authorized_at,null);
    });
    await t.test('impede chave duplicada na mesma conta; permite mesma chave em contas diferentes',async () => {
      assert.equal((await alice.from('fiscal_documents').insert(document)).error.code,'23505');
      assert.equal((await bob.from('fiscal_documents').insert({...document,user_id:bobId})).error,null);
    });
    await t.test('isola documentos e impede atribuição de itens ao documento de outro usuário',async () => {
      assert.deepEqual((await bob.from('fiscal_documents').select('*').eq('id',documentId)).data,[]);
      const attack=await bob.from('fiscal_items').insert({user_id:bobId,document_id:documentId,item_number:1,description:'Tentativa',quantity:1,unit_value:10,total_value:10});
      assert.equal(attack.error.code,'23503');
      assert.ok((await bob.from('fiscal_documents').insert({...document,access_key:'2'.repeat(44)})).error);
    });
    await t.test('indicadores agregam somente documentos do usuário e preservam centavos',async () => {
      const {data,error}=await alice.rpc('dashboard_summary');assert.equal(error,null);
      assert.equal(data.documents,1);assert.equal(data.totalValue,'10.29');
    });
    await t.test('bucket privado isola download e exclusão e impede sobrescrever original',async () => {
      const path=`${aliceId}/test-${randomUUID()}.xml`;files.push(path);
      assert.equal((await alice.storage.from('fiscal-xml').upload(path,'<teste/>',{contentType:'application/xml'})).error,null);
      assert.ok((await bob.storage.from('fiscal-xml').download(path)).error);
      const response=await fetch(`${url}/storage/v1/object/public/fiscal-xml/${path}`);assert.equal(response.ok,false);
      const removed=await bob.storage.from('fiscal-xml').remove([path]);assert.ok(removed.error || !removed.data.length);
      assert.equal((await alice.storage.from('fiscal-xml').download(path)).error,null);
      assert.ok((await alice.storage.from('fiscal-xml').upload(path,'<alterado/>',{contentType:'application/xml',upsert:true})).error);
    });
    await t.test('limitador persistente é atômico sob concorrência',async () => {
      const p_key=createHash('sha256').update(randomUUID()).digest('hex');
      const results=await Promise.all(Array.from({length:12},() => admin.rpc('consume_rate_limit',{p_key,p_limit:5,p_window_seconds:60})));
      assert.ok(results.every(result=>!result.error));assert.equal(results.filter(result=>result.data.allowed).length,5);
    });
    await t.test('logout revoga acesso direto mesmo com JWT ainda não expirado',async () => {
      const {data}=await alice.auth.getSession();
      const stale=createClient(url,key,{...options,global:{headers:{Authorization:`Bearer ${data.session.access_token}`}}});
      assert.equal((await alice.auth.signOut({scope:'global'})).error,null);
      assert.equal((await stale.rpc('has_active_session')).data,false);
      assert.deepEqual((await stale.from('fiscal_documents').select('*')).data,[]);
    });
  } finally {
    if(files.length) await admin.storage.from('fiscal-xml').remove(files);
    for(const id of ids) await admin.auth.admin.deleteUser(id);
  }
});
