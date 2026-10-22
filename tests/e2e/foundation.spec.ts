import { test,expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('E2E executa apenas com Supabase local.');
const admin=createClient(url,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`e2e-${randomUUID()}@example.test`;
const password=`Segura-${randomUUID()}!`;
let userId:string;
test.beforeAll(async () => {
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Pessoa Navegador'}});
  if(error)throw error;
  userId=data.user.id;
});
test.afterAll(async () => { if(userId) await admin.auth.admin.deleteUser(userId); });

test('rotas privadas e endpoints rejeitam acesso anônimo',async ({page,request}) => {
  await page.goto('/painel');await expect(page).toHaveURL(/\/entrar$/);
  const response=await request.patch('/api/profile',{headers:{origin:'http://localhost:3000'},data:{fullName:'Sem Sessão'}});
  expect(response.status()).toBe(401);
  const csrf=await request.post('/api/auth/login',{headers:{origin:'https://evil.example'},data:{email,password}});
  expect(csrf.status()).toBe(403);
});

test('login, perfil, preferências persistentes, histórico, navegação e exclusão',async ({page}) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail',{exact:true}).fill(email);
  await page.getByLabel('Senha',{exact:true}).fill('senha-errada-123');
  await page.getByRole('button',{name:'Entrar na minha conta'}).click();
  await expect(page.locator('form [role=alert]')).toContainText('E-mail ou senha incorretos');
  await page.getByLabel('Senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Entrar na minha conta'}).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole('heading',{name:/Olá, Pessoa/})).toBeVisible();
  await expect(page.getByText('R$ 0,00',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Configurar meu perfil',exact:true}).click();
  await page.getByLabel('Nome completo',{exact:true}).fill('Pessoa Atualizada');
  await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();
  await expect(page.getByText('Perfil atualizado.',{exact:true})).toBeVisible();
  await page.getByText('Escuro',{exact:true}).click();
  await page.getByText('Roxo',{exact:true}).click();
  await page.getByRole('button',{name:'Salvar aparência'}).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-accent','purple');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-accent','purple');
  await expect(page.getByLabel('Nome completo')).toHaveValue('Pessoa Atualizada');
  await page.getByRole('button',{name:'Buscar páginas'}).click();
  await page.getByRole('textbox',{name:'Nome da página'}).fill('historico');
  await page.getByRole('dialog').getByRole('link',{name:'Histórico de atividade'}).click();
  await expect(page.getByRole('heading',{name:'Histórico de atividade'})).toBeVisible();
  await expect(page.getByRole('cell',{name:'Perfil atualizado',exact:true})).toBeVisible();
  await page.screenshot({path:'.artifacts/history-desktop.png',fullPage:true});
  await page.goto('/painel');
  await page.screenshot({path:'.artifacts/dashboard-dark.png',fullPage:true});
  await page.getByRole('button',{name:'Alternar tema claro ou escuro'}).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.screenshot({path:'.artifacts/dashboard-light.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Abrir menu'}).click();
  await page.getByRole('dialog').getByRole('link',{name:'Configurações',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Configurações',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'.artifacts/settings-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Excluir minha conta'}).click();
  await page.getByLabel('Confirme sua senha atual').fill(password);
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR');
  await page.getByRole('button',{name:'Excluir permanentemente'}).click();
  await expect(page).toHaveURL(/conta=excluida/);
  const deleted=await admin.auth.admin.getUserById(userId);expect(deleted.error).not.toBeNull();
});

test('cadastro envia confirmação real e exige confirmação de senha',async ({page}) => {
  const signupEmail=`signup-${randomUUID()}@example.test`;
  await page.goto('/cadastro');
  await page.getByLabel('Nome completo').fill('Pessoa Cadastro');
  await page.getByLabel('E-mail',{exact:true}).fill(signupEmail);
  await page.getByLabel('Senha',{exact:true}).fill(password);
  await page.getByLabel('Confirmar senha',{exact:true}).fill('outra-senha-longa');
  await page.getByRole('button',{name:'Criar minha conta'}).click();
  await expect(page.locator('form [role=alert]')).toContainText('As senhas precisam ser iguais');
  await page.getByLabel('Confirmar senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Criar minha conta'}).click();
  await expect(page.getByRole('status')).toContainText('Confira seu e-mail');
  const users=await admin.auth.admin.listUsers({perPage:1000});
  const created=users.data.users.find(user=>user.email===signupEmail);expect(created).toBeDefined();
  try {
    expect(created!.email_confirmed_at).toBeFalsy();
    const messages=await fetch('http://127.0.0.1:54324/api/v1/messages').then(res=>res.json());
    const message=messages.messages.find((item:{To:{Address:string}[]})=>item.To.some(to=>to.Address===signupEmail));
    expect(message).toBeDefined();
    const mail=await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`).then(res=>res.json());
    const confirmation=String(mail.HTML).match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/);
    expect(confirmation).not.toBeNull();
    await page.goto(confirmation![1].replaceAll('&amp;','&'));
    await expect(page).toHaveURL(/\/painel$/);
    await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.goto('/painel');await expect(page).toHaveURL(/\/entrar$/);
  } finally { if(created)await admin.auth.admin.deleteUser(created.id); }
});

test('recuperação por e-mail atualiza a senha e encerra sessões anteriores',async ({page}) => {
  const recoveryEmail=`recovery-${randomUUID()}@example.test`;
  const newPassword=`Nova-${randomUUID()}!`;
  const created=await admin.auth.admin.createUser({email:recoveryEmail,password,email_confirm:true,user_metadata:{full_name:'Pessoa Recuperação'}});
  if(created.error)throw created.error;
  try {
    await page.goto('/recuperar-senha');
    await page.getByLabel('E-mail',{exact:true}).fill(recoveryEmail);
    await page.getByRole('button',{name:'Enviar link de recuperação'}).click();
    await expect(page.getByRole('status')).toContainText('Se o e-mail estiver cadastrado');
    const messages=await fetch('http://127.0.0.1:54324/api/v1/messages').then(res=>res.json());
    const message=messages.messages.find((item:{To:{Address:string}[]})=>item.To.some(to=>to.Address===recoveryEmail));
    expect(message).toBeDefined();
    const mail=await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`).then(res=>res.json());
    const link=String(mail.HTML).match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/);
    expect(link).not.toBeNull();
    await page.goto(link![1].replaceAll('&amp;','&'));
    await expect(page).toHaveURL(/\/nova-senha$/);
    await page.getByLabel('Nova senha',{exact:true}).fill(newPassword);
    await page.getByLabel('Confirmar senha',{exact:true}).fill(newPassword);
    await page.getByRole('button',{name:'Salvar nova senha'}).click();
    await expect(page).toHaveURL(/senha=atualizada/);
    await page.getByLabel('E-mail',{exact:true}).fill(recoveryEmail);
    await page.getByLabel('Senha',{exact:true}).fill(newPassword);
    await page.getByRole('button',{name:'Entrar na minha conta'}).click();
    await expect(page).toHaveURL(/\/painel$/);
    await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
    await expect(page).toHaveURL(/\/entrar$/);
  } finally { await admin.auth.admin.deleteUser(created.data.user.id); }
});
