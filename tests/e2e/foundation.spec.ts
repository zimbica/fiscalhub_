import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('E2E executa apenas com Supabase local.');
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const origin = 'http://localhost:3000';

test('acesso por apelido exige origem válida e páginas anteriores redirecionam', async ({ page, request }) => {
  await page.goto('/painel'); await expect(page).toHaveURL(/\/entrar$/);
  for (const path of ['/cadastro', '/recuperar-senha', '/nova-senha']) {
    await page.goto(path); await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByLabel('Apelido', { exact: true })).toBeVisible();
    await expect(page.locator('input[type=email], input[type=password]')).toHaveCount(0);
  }
  expect((await request.get('/api/documents')).status()).toBe(401);
  expect((await request.post('/api/auth/anonymous', { headers: { origin: 'https://evil.example' }, data: { nickname: 'Pessoa' } })).status()).toBe(403);
  expect((await request.post('/api/auth/anonymous', { headers: { origin }, data: { nickname: 'x' } })).status()).toBe(400);
});

test('apelido sem senha: persistência, isolamento entre navegadores e exclusão real', async ({ page, browser }) => {
  const nickname = `Pessoa-${randomUUID()}`;
  const ids: string[] = [];
  const second = await browser.newContext();
  try {
    await page.goto('/entrar');
    await page.getByLabel('Apelido', { exact: true }).fill(nickname);
    await page.route('**/api/auth/anonymous', route => route.abort('failed'), { times: 1 });
    await page.getByRole('button', { name: 'Começar', exact: true }).click();
    await expect(page.locator('form [role=alert]')).toContainText('Não foi possível confirmar');
    await expect(page.getByLabel('Apelido', { exact: true })).toHaveValue(nickname);
    await page.getByRole('button', { name: 'Começar', exact: true }).click();
    await expect(page).toHaveURL(/\/painel$/);
    const users = await admin.auth.admin.listUsers({ perPage: 1000 });
    const user = users.data.users.find(u => u.user_metadata.full_name === nickname)!;
    ids.push(user.id); expect(user.is_anonymous).toBe(true); expect(user.email || '').toBe('');
    expect((await admin.from('profiles').select('full_name,role').eq('id', user.id).single()).data).toEqual({full_name:nickname,role:'user'});
    const job = await page.request.post('/api/imports', { headers: { origin }, data: { name: 'Teste por apelido' } });
    expect(job.status()).toBe(201);
    const jobId = (await job.json()).data.id;
    const imported = await page.request.post(`/api/imports/${jobId}/files?name=nfe.xml`, {headers:{origin,'content-type':'application/xml'},data:await readFile('tests/fixtures/xml/nfe-55.xml')});
    expect(imported.ok()).toBe(true);
    const document = await admin.from('fiscal_documents').select('id').eq('user_id',user.id).single();
    expect(document.error).toBeNull();
    await page.goto('/entrar'); await expect(page).toHaveURL(/\/painel$/);
    // Reposting must reuse the existing session, never switch identity based on nickname.
    expect((await page.request.post('/api/auth/anonymous',{headers:{origin},data:{nickname:'Outro apelido'}})).status()).toBe(200);
    await page.goto('/configuracoes');
    await expect(page.getByLabel('Apelido',{exact:true})).toHaveValue(nickname);
    await expect(page.locator('input[type=email], input[type=password]')).toHaveCount(0);
    await page.getByText('Escuro',{exact:true}).click(); await page.getByText('Roxo',{exact:true}).click();
    await page.getByRole('button',{name:'Salvar aparência'}).click();
    await expect(page.locator('html')).toHaveAttribute('data-accent','purple');
    await page.reload(); await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button',{name:'Encerrar acesso',exact:true}).click();
    await expect(page.getByRole('dialog')).toContainText('Você perderá o acesso');
    await page.getByRole('button',{name:'Continuar aqui'}).click();
    const other = await second.newPage();
    await other.goto('/entrar'); await other.getByLabel('Apelido',{exact:true}).fill(nickname);
    await other.getByRole('button',{name:'Começar',exact:true}).click(); await expect(other).toHaveURL(/\/painel$/);
    const both = await admin.auth.admin.listUsers({perPage:1000});
    const otherUser = both.data.users.find(u=>u.id!==user.id && u.user_metadata.full_name===nickname)!; ids.push(otherUser.id);
    expect((await other.request.get(`/api/documents/${document.data!.id}`)).status()).toBe(404);
    expect((await admin.from('fiscal_documents').select('id').eq('user_id',otherUser.id)).data).toEqual([]);
    await page.getByRole('button',{name:'Excluir minha conta'}).click();
    await expect(page.getByRole('dialog').locator('input[type=password]')).toHaveCount(0);
    await page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR');
    await page.getByRole('button',{name:'Excluir permanentemente'}).click();
    await expect(page).toHaveURL(/conta=excluida/);
    expect((await admin.auth.admin.getUserById(user.id)).error).not.toBeNull();
    expect((await admin.storage.from('fiscal-xml').list(user.id)).data).toEqual([]);
    expect((await page.request.get('/api/documents')).status()).toBe(401);
    await other.getByRole('button',{name:'Encerrar acesso',exact:true}).click();
    await other.getByRole('button',{name:'Encerrar mesmo assim'}).click(); await expect(other).toHaveURL(/\/entrar$/);
    expect((await other.request.get('/api/documents')).status()).toBe(401);
  } finally {
    await second.close();
    // Normally the first user is already deleted by the UI; cleanup on failures too.
    for (const id of ids) {
      const files=await admin.storage.from('fiscal-xml').list(id);
      if(files.data?.length) await admin.storage.from('fiscal-xml').remove(files.data.filter(f=>f.id).map(f=>`${id}/${f.name}`));
      await admin.auth.admin.deleteUser(id);
    }
  }
});
