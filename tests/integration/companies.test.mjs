import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Integração exige Supabase LOCAL.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const cnpj='00000000000191';
const source={name:'Fixture de integração',url:'https://example.org',retrievedAt:new Date().toISOString()};
const company={cnpj,legalName:'Empresa sintética para teste',tradeName:null,status:'ATIVA',fieldSources:{legalName:source}};
const ie={outcome:'verified',source,message:'Fixture',registrations:[{uf:'SP',registration:'fixture-sp',status:'active',verified:true,source,statusDescription:'Habilitada · Sem restrição',sourceUpdatedAt:source.retrievedAt},{uf:'RS',registration:'fixture-rs',status:'suspended',verified:true,source}]};

test('consultas cadastrais atômicas e isoladas no PostgreSQL',async(t)=>{
  const ids=[],clients=[];
  try{
    for(const label of ['company-a','company-b']){
      const email=`${label}-${randomUUID()}@example.test`,password=`Senha-${randomUUID()}!`;
      const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);ids.push(created.data.user.id);
      const client=createClient(url,key,options);assert.equal((await client.auth.signInWithPassword({email,password})).error,null);clients.push(client);
    }
    const [alice,bob]=clients;let companyId;
    await t.test('salva empresa, múltiplas IEs, histórico e atividade em uma transação',async()=>{
      const result=await alice.rpc('save_company_query',{p_cnpj:cnpj,p_company:company,p_ie:ie});assert.equal(result.error,null);companyId=result.data.id;
      assert.ok(new Date(result.data.expiresAt)>new Date(result.data.queriedAt));
      const persisted=(await alice.from('companies').select('ie_result').eq('id',companyId).single()).data.ie_result;
      assert.equal(persisted.registrations[0].statusDescription,'Habilitada · Sem restrição');
      assert.equal(persisted.registrations[0].sourceUpdatedAt,source.retrievedAt);
      assert.equal((await alice.from('state_registrations').select('*')).data.length,2);
      assert.equal((await alice.from('cnpj_queries').select('*')).data.length,1);
      assert.equal((await alice.from('activity_events').select('*').eq('action','cnpj_queried')).data.length,1);
    });
    await t.test('RLS e FKs bloqueiam acesso e associação a dados de outra conta',async()=>{
      for(const table of ['companies','state_registrations','cnpj_queries'])assert.deepEqual((await bob.from(table).select('*')).data,[]);
      assert.deepEqual((await bob.from('companies').update({is_favorite:true}).eq('id',companyId).select()).data,[]);
      assert.deepEqual((await bob.from('companies').delete().eq('id',companyId).select()).data,[]);
      assert.equal((await bob.from('cnpj_queries').insert({user_id:ids[1],company_id:companyId,cnpj,provider:'fixture',outcome:'success'})).error.code,'23503');
    });
    await t.test('refresh preserva favorito, substitui IE e não duplica empresa',async()=>{
      assert.equal((await alice.from('companies').update({is_favorite:true}).eq('id',companyId)).error,null);
      const result=await alice.rpc('save_company_query',{p_cnpj:cnpj,p_company:company,p_ie:{outcome:'unavailable',registrations:[],source:null,message:'Não verificada'}});
      assert.equal(result.error,null);assert.equal(result.data.id,companyId);
      const records=await alice.from('companies').select('*');assert.equal(records.data.length,1);assert.equal(records.data[0].is_favorite,true);
      assert.deepEqual((await alice.from('state_registrations').select('*')).data,[]);
      assert.equal((await alice.from('cnpj_queries').select('*')).data.length,2);
    });
    await t.test('falha no cadastro de IE reverte atualização inteira',async()=>{
      const bad=await alice.rpc('save_company_query',{p_cnpj:cnpj,p_company:{...company,legalName:'NÃO PERSISTIR'},p_ie:{...ie,registrations:[{...ie.registrations[0],uf:'INVALID'}]}});
      assert.ok(bad.error);assert.equal((await alice.from('companies').select('legal_name').single()).data.legal_name,company.legalName);
      assert.equal((await alice.from('cnpj_queries').select('*')).data.length,2);
    });
    await t.test('mesmo CNPJ em outra conta possui cache independente',async()=>{
      const result=await bob.rpc('save_company_query',{p_cnpj:cnpj,p_company:company,p_ie:ie});assert.equal(result.error,null);assert.notEqual(result.data.id,companyId);
      assert.equal((await bob.from('companies').select('*')).data.length,1);
    });
    await t.test('anônimo não executa RPC; TTL e CNPJ incompatível são recusados',async()=>{
      const anonymous=createClient(url,key,options);
      assert.ok((await anonymous.rpc('save_company_query',{p_cnpj:cnpj,p_company:company,p_ie:ie})).error);
      assert.ok((await alice.rpc('save_company_query',{p_cnpj:cnpj,p_company:company,p_ie:ie,p_ttl_seconds:999999})).error);
      assert.ok((await alice.rpc('save_company_query',{p_cnpj:cnpj,p_company:{...company,cnpj:'123'},p_ie:ie})).error);
    });
    await t.test('exclusão remove cache e consultas associadas sem afetar outra conta',async()=>{
      assert.equal((await alice.from('companies').delete().eq('id',companyId)).error,null);
      assert.deepEqual((await alice.from('cnpj_queries').select('*')).data,[]);
      assert.equal((await bob.from('companies').select('*')).data.length,1);
    });
  }finally{for(const id of ids)await admin.auth.admin.deleteUser(id);}
});
