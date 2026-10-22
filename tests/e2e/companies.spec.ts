import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {normalizeBrasilApi} from '../../src/services/providers/brasil-api';
import {unavailableIe} from '../../src/services/providers/state-registration';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
if(!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('E2E exige Supabase local.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,process.env.SUPABASE_SECRET_KEY!,options);
const cnpj='00000000000191';

test('CNPJ inválido, cache real, favoritos, pesquisa, responsividade e exclusão',async({page,context})=>{
  const email=`cnpj-${randomUUID()}@example.test`,password=`Senha-${randomUUID()}!`;
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;
  try{
    const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,options);
    const login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;
    const company=normalizeBrasilApi({cnpj,razao_social:'Empresa sintética E2E',descricao_situacao_cadastral:'ATIVA',uf:'RS'},cnpj);
    const seed=await client.rpc('save_company_query',{p_cnpj:cnpj,p_company:company,p_ie:unavailableIe()});if(seed.error)throw seed.error;
    await page.goto('/entrar');await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Entrar na minha conta'}).click();await expect(page).toHaveURL(/\/painel$/);
    await page.goto('/consulta-cnpj');
    const invalid=await page.request.post('/api/companies',{headers:{origin:'http://localhost:3000'},data:{cnpj:'00000000000192'}});
    expect(invalid.status()).toBe(400);
    await page.getByLabel('CNPJ da empresa').fill('00000000000192');await page.getByLabel('CNPJ da empresa').press('Enter');
    await expect(page.getByRole('alert').filter({hasText:'CNPJ inválido'})).toBeVisible();
    await page.getByLabel('CNPJ da empresa').fill(cnpj);await page.getByLabel('CNPJ da empresa').press('Enter');
    await expect(page.getByRole('heading',{name:'Empresa sintética E2E'})).toBeVisible();
    await expect(page.getByText(/Consulta em cache ·/)).toBeVisible();
    await expect(page.getByText('IE não verificada automaticamente',{exact:true})).toBeVisible();
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await page.getByRole('button',{name:'Copiar dados da empresa'}).click();
    expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain('IE: Não verificada');
    await page.getByRole('button',{name:'Favoritar Empresa sintética E2E',exact:true}).click();
    await expect(page.getByRole('button',{name:'Desfavoritar Empresa sintética E2E',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Favoritos',exact:true}).click();
    await page.getByLabel('Pesquisar empresas no histórico').fill('inexistente');await page.getByRole('button',{name:'Pesquisar histórico',exact:true}).click();
    await expect(page.getByText('Nenhuma empresa corresponde ao filtro.')).toBeVisible();
    await page.getByLabel('Pesquisar empresas no histórico').fill('Empresa sintética');await page.getByRole('button',{name:'Pesquisar histórico',exact:true}).click();
    await expect(page.getByRole('button',{name:'Empresa sintética E2E',exact:true})).toBeVisible();
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Excluir consulta de Empresa sintética E2E'}).click();
    await page.getByRole('button',{name:'Remover consulta',exact:true}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await client.from('companies').select('*')).data).toEqual([]);
    expect((await client.from('cnpj_queries').select('*')).data).toEqual([]);
  }finally{await admin.auth.admin.deleteUser(created.data.user.id);}
});

test('consulta BrasilAPI ao vivo pelo navegador e grava resultado no banco',async({page})=>{
  test.skip(process.env.REAL_CNPJ_TEST!=='1','Teste externo opt-in; depende da disponibilidade da BrasilAPI.');
  const email=`cnpj-live-${randomUUID()}@example.test`,password=`Senha-${randomUUID()}!`;
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;
  try{
    await page.goto('/entrar');await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Entrar na minha conta'}).click();await expect(page).toHaveURL(/\/painel$/);
    await page.goto('/consulta-cnpj');await page.getByLabel('CNPJ da empresa').fill(cnpj);
    const responsePromise=page.waitForResponse(response=>response.url().endsWith('/api/companies') && response.request().method()==='POST');
    await page.getByRole('button',{name:'Consultar CNPJ',exact:true}).click();
    const response=await responsePromise;expect(response.status()).toBe(200);
    const result=(await response.json()).data;
    expect(result.company.cnpj).toBe(cnpj);expect(result.fromCache).toBe(false);expect(result.ie.outcome).toBe('unavailable');
    await expect(page.getByRole('heading',{name:result.company.legalName,exact:true})).toBeVisible();
    const records=await admin.from('companies').select('id,cnpj').eq('user_id',created.data.user.id);
    expect(records.data).toEqual([{id:result.id,cnpj}]);
    await page.screenshot({path:'.artifacts/cnpj-live-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:'.artifacts/cnpj-live-mobile.png',fullPage:true});
  }finally{await admin.auth.admin.deleteUser(created.data.user.id);}
});
