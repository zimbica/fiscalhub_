# Implantação: GitHub + Supabase + Vercel

## 1. Supabase

O projeto informado nesta sessão é `kwgrlocfbkxbupydxmdu`. Confirme no painel que é o FiscalHub antes de aplicar qualquer SQL. Nenhum outro projeto deve receber estas migrations.

1. Em uma organização Free, crie ou use o projeto FiscalHub. A cota gratuita é contabilizada conforme as condições atuais da conta/organizações; criar outra organização não garante mais projetos gratuitos.
2. Aplique `supabase/migrations/20261022144803_foundation.sql` pelo SQL Editor do projeto novo e vazio. Alternativamente, no seu computador autenticado:

   ```bash
   npx supabase login
   npx supabase link --project-ref kwgrlocfbkxbupydxmdu
   npx supabase db push --dry-run
   npx supabase db push
   ```

   Não aplique pelo SQL Editor e depois repita pelo CLI sem reconciliar o histórico. Prefira CLI para projetos já versionados.
3. Confira que as tabelas foram criadas, RLS está ativa e o bucket `fiscal-xml` é privado. Execute o Security Advisor.
4. Em **Project Settings → API Keys**, obtenha a chave publicável (`sb_publishable_...`) e uma chave secreta do servidor (`sb_secret_...`). Chaves legadas `anon/service_role` só são usadas como compatibilidade pelo ambiente local.
5. Em **Authentication → URL Configuration**, configure:
   - Site URL: `https://SEU-PROJETO.vercel.app`.
   - Redirect URLs exatas: `https://SEU-PROJETO.vercel.app/auth/callback` e `https://SEU-PROJETO.vercel.app/auth/callback?next=/nova-senha`.
   - Para desenvolvimento separado, adicione as equivalentes em `http://localhost:3000`.
6. Ative confirmação de e-mail, senha mínima de 12 caracteres e revise os limites de Auth. O fluxo PKCE padrão usa o mesmo navegador que iniciou a operação. Templates personalizados não são necessários.
7. O SMTP padrão do Supabase tem restrições de destinatários e volume e não serve como serviço aberto de produção. Para cadastrar usuários reais fora dos membros autorizados, configure SMTP próprio compatível, avaliando um plano gratuito e requisitos de domínio. Não desative confirmação de e-mail para ocultar essa limitação.

## 2. GitHub

Repositório do usuário: <https://github.com/zimbica/fiscalhub_>.

```bash
git remote -v
git push -u origin main
```

Se o repositório não estiver configurado em outra cópia local:

```bash
git remote add origin https://github.com/zimbica/fiscalhub_.git
git branch -M main
git push -u origin main
```

O repositório foi criado público pelo proprietário. Somente código, documentação e testes sintéticos devem ser enviados. Os checks em `.github/workflows/ci.yml` não usam credenciais de produção; instanciam Supabase local com Docker.

## 3. Vercel

1. Em <https://vercel.com/new>, importe `zimbica/fiscalhub_` com preset **Next.js**.
2. Configure Node.js 24, install `npm ci`, build `npm run build`. Não use Static Export: a aplicação depende de SSR e Route Handlers.
3. Configure as variáveis em **Project → Settings → Environment Variables**:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_APP_URL` | URL HTTPS canônica da instalação, sem caminho |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL de API do projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável |
   | `SUPABASE_SECRET_KEY` | Chave secreta do servidor, marcada como sensível |
   | `RATE_LIMIT_SECRET` | Segredo aleatório de 32 bytes, marcado como sensível |

   Gere o último localmente: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Cole apenas nas configurações de ambiente, nunca em issues ou commits.
4. Publique e ajuste as URLs no Supabase para coincidir com `NEXT_PUBLIC_APP_URL`. Se precisar mudar a URL depois do primeiro deploy, atualize a variável e redeploy.
5. Para Preview Deployments, use ambiente Supabase separado ou URLs de preview explicitamente autorizadas. Não libere um wildcard irrestrito para autenticação.
6. Teste cadastro, confirmação, login, recarregamento, preferências, logout, recuperação e exclusão de uma conta de teste no domínio final.

## Custo e limites

Não foi adicionado serviço pago. O Vercel Hobby é destinado a uso **pessoal e não comercial**. Para uso empresarial/comercial, revisar o plano ou escolher hospedagem compatível com os termos. Supabase Free tem limites de banco, arquivos, tráfego e e-mail e pode pausar projetos inativos; consulte os limites atuais antes de importar arquivos reais. Não ativar recursos pagos automaticamente.

A etapa 3 deve processar lotes curtos, respeitar payload/tempo/memória das Functions e permitir retomada. A etapa 4 só será considerada pronta após demonstrar XSD real no runtime de produção.

## Estado de verificação

Veja `docs/testing.md` para os testes realmente executados. Ter o projeto vinculado ao GitHub no Supabase não configura automaticamente o deploy da Vercel, as migrations, o SMTP nem as variáveis da aplicação.
