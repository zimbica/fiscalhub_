> **Mudança de acesso:** a interface agora usa somente apelido e Supabase Auth anônimo. Habilite Anonymous Sign-Ins conforme [estas instruções](nickname-access.md). SMTP e redirects de e-mail abaixo referem-se ao fluxo anterior e não são necessários para a entrada por apelido.

# Implantação: GitHub + Supabase + Vercel

## 1. Supabase

O projeto informado nesta sessão é `kwgrlocfbkxbupydxmdu`. Confirme no painel que é o FiscalHub antes de aplicar qualquer SQL. Nenhum outro projeto deve receber estas migrations.

1. Em uma organização Free, crie ou use o projeto FiscalHub. A cota gratuita é contabilizada conforme as condições atuais da conta/organizações; criar outra organização não garante mais projetos gratuitos.
2. Aplique as migrations em ordem (`20261022144803_foundation.sql`, `20261022174422_company_queries.sql`, `20261022180528_company_query_index.sql`, `20261022181403_document_imports.sql`, `20261022232514_document_reports.sql`, `20261023125337_xml_validation.sql`, `20261023164911_rejection_search.sql` e `20261023164912_rejection_catalog_initial.sql`) pelo SQL Editor do projeto novo e vazio. Se a fundação já foi aplicada, execute somente as pendentes. Alternativamente, no seu computador autenticado:

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
6. Teste cadastro, confirmação, login, recarregamento, preferências, consulta de CNPJ, atualização/cache, logout, recuperação e exclusão de uma conta de teste no domínio final.
7. As variáveis opcionais `IE_PROVIDER_URL` e `IE_PROVIDER_TOKEN` habilitam o adaptador de IE somente quando você já dispõe de um gateway autorizado que implemente o [contrato documentado](company-providers.md). Não é uma API gratuita incluída; deixe ambas vazias para usar os links oficiais manuais.

## Custo e limites

Não foi adicionado serviço pago. O Vercel Hobby é destinado a uso **pessoal e não comercial**. Para uso empresarial/comercial, revisar o plano ou escolher hospedagem compatível com os termos. Supabase Free tem limites de banco, arquivos, tráfego e e-mail e pode pausar projetos inativos; consulte os limites atuais antes de importar arquivos reais. Não ativar recursos pagos automaticamente.

A etapa 3 envia um XML de até 2 MiB por requisição, com pausa/retomada e descompactação no navegador. Nenhuma função precisa permanecer ativa durante todo o lote. ZIPs e centenas de originais consomem cotas de Storage, banco e tráfego: monitore o uso no painel. Consulte [limites](xml-imports.md). O validador usa uma função Node com worker WASM limitado a 15 segundos; não precisa de serviço permanente ou binário nativo externo. Preserve `outputFileTracingIncludes` do Next.js para empacotar os XSDs e o WASM. No domínio publicado, execute validações positiva/negativa com fixtures sintéticas antes de utilizar documentos reais.

## Estado de verificação

Em 23/10/2026 as oito migrations das etapas 1–5 estão aplicadas no projeto `kwgrlocfbkxbupydxmdu`. Foram conferidas 19 tabelas públicas com RLS, funções de importação/relatórios/detalhes/validação, dois pacotes de schemas registrados, oito rejeições com 16 referências e bucket XML privado. O registro das migrations foi alinhado aos timestamps do repositório somente após conferir os hashes do SQL aplicado; não reaplique migrations já presentes. Os advisors remotos ficaram sem WARN/ERROR.

Os INFO restantes são [índices ainda não usados](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) no banco sem documentos e [RLS sem política no limitador privado](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), intencionalmente acessível apenas ao serviço. Não abra políticas para usuários nesse limitador.

**Publicado na Vercel em 26/10/2026; veja o registro de verificação abaixo.** A conexão disponível não fornece chave secreta nem configura URLs/SMTP de Auth. Configure essas opções e as variáveis diretamente nos painéis, sem enviar segredos no chat. Os testes completos de usuário foram executados no Supabase local; no remoto foi conferida a estrutura, não o login no domínio final.

Veja `docs/testing.md` para os testes realmente executados. Ter o projeto vinculado ao GitHub no Supabase não configura automaticamente o deploy da Vercel, as migrations, o SMTP nem as variáveis da aplicação.

Atualizações do catálogo não exigem API paga: siga o [procedimento editorial e gerador de migrations](rejections.md). Usuários da aplicação não recebem permissão de editar o catálogo global.

## Verificação de configuração antes de publicar

No ambiente que já contém as variáveis de produção, execute `npm run deploy:check`.
Se elas estiverem em um arquivo local ignorado pelo Git, use explicitamente
`node --env-file=.env.local scripts/deployment-preflight.mjs`. Não use o arquivo
criado por `setup:local`: o verificador de produção recusa localhost e HTTP.
O comando não carrega arquivos automaticamente nem imprime valores de variáveis.

Para bloquear um deploy com configuração incompleta, configure na Vercel o Build
Command como `npm run deploy:check && npm run build`. As variáveis públicas são
incorporadas ao bundle durante o build; alterá-las exige novo deploy. Configure
cada ambiente de Production/Preview antes de habilitar essa verificação.

O verificador é offline e não autentica chaves, mede entropia ou comprova acesso
aos serviços. Ele detecta formato e erros comuns: cinco variáveis obrigatórias,
HTTPS, ausência de credenciais em URLs, troca de chaves pública/secreta, exposição
de segredos conhecidos em `NEXT_PUBLIC_*`, segredo do limitador curto/repetitivo
e configuração incompleta do provedor opcional de IE. Os sete testes desse comando
fazem parte de `npm run check` e do CI, usando apenas valores sintéticos.

Após publicar, execute no domínio final, com uma conta de teste:

1. Cadastro e confirmação, login, recuperação de senha e logout.
2. Consulta de CNPJ e indicação separada de IE não verificada.
3. Importação de XML sintético, filtros e download do original autenticado.
4. Validação das fixtures XSD válida e inválida, conferindo a mensagem real.
5. Pesquisa de rejeição, favorito, preferências e exclusão da conta de teste.

A aprovação da configuração local não substitui esses testes nem confirma que
SMTP, redirects de Auth, migrations e empacotamento funcionam no domínio final.

## Vercel configurada — 26/10/2026 (UTC)

Criado o projeto `fiscalhub` na conta/time `gustavoandrade-6858` (Hobby),
ID `prj_FYPsXKZyllDUAvL10jBvVJCgJEhD`. Domínio reservado e verificado:
`https://fiscalhub-beta.vercel.app`. O primeiro deploy foi publicado após a configuração das cinco variáveis.

Configurados Next.js, Node 24, instalação `npm ci` e build com verificação prévia
`npm run deploy:check && npm run build`. As variáveis Production
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `RATE_LIMIT_SECRET` foram adicionadas.
O segredo do limitador foi gerado aleatoriamente e armazenado como Sensitive.
O proprietário adicionou `SUPABASE_SECRET_KEY` como Sensitive/Production diretamente no painel; a conexão foi verificada pelo backend publicado. Não copiar credenciais locais para produção.

O vínculo GitHub automático foi recusado pela Vercel por ausência de Login
Connection com GitHub. Conecte a conta GitHub em Account Settings → Authentication
para permitir vincular `zimbica/fiscalhub_`. A publicação por CLI autenticado pode
ser feita independentemente desse vínculo. `.vercelignore` exclui `.env*`, caches,
artefatos locais e relatórios do upload; preserve os schemas e scripts de build.

Após a publicação, configure no Supabase → Authentication → URL Configuration:

- Site URL: `https://fiscalhub-beta.vercel.app`
- Redirect URL: `https://fiscalhub-beta.vercel.app/auth/callback`
- Redirect URL: `https://fiscalhub-beta.vercel.app/auth/callback?next=/nova-senha`

Mantenha a confirmação por e-mail e configure SMTP apropriado conforme explicado
acima. Esses ajustes de Auth não foram executados pela conexão disponível.

## Primeiro deploy publicado — 26/10/2026

- URL pública: https://fiscalhub-beta.vercel.app
- Projeto: `gustavoandrade-6858/fiscalhub`, plano Hobby.
- Deployment: `dpl_Ai97AmLgPbSLieBgxBTmb2SWYhoQ`, estado `READY`, Production.
- Código publicado: `fce399479a4b52715aaa4ebd10ac9f14bb8cc6f3`.
- Build remoto executou `npm ci`, `deploy:check`, Next.js/TypeScript e verificação
  dos 14 schemas e motor WASM. A etapa de instalação informou zero vulnerabilidades.
- Deploy inicialmente sem atribuição do domínio principal; promovido após testes
  de acesso ao Supabase e proteção de documentos.
- `POST /api/auth/login` com JSON vazio e origem canônica retornou 400 de validação
  depois da execução bem-sucedida do limitador no Supabase. Isso verifica o uso da
  chave secreta pelo servidor, sem revelar seu valor ou criar conta de teste.
- `GET /api/documents` anônimo retornou 401. `/painel` retornou 307 para `/entrar`.
- `/entrar` público retornou 200; Chromium confirmou título e botão de login
  habilitado; layout de 390 px sem rolagem horizontal.
- Consulta dos logs de erro do deployment nos 15 minutos anteriores à verificação
  retornou zero registros. Isso não comprova ausência de falhas em fluxos não testados.

A variável adicional `publishable_key` foi cadastrada pelo proprietário, mas não
é utilizada pelo código. As cinco variáveis documentadas continuam sendo as
necessárias. Não foram alteradas proteções do projeto para testar o deployment;
o CLI usou o mecanismo autorizado de acesso da Vercel.

Ainda não verificados no domínio publicado: cadastro com confirmação por e-mail,
recuperação por e-mail, SMTP e fluxos fiscais autenticados completos. As suítes E2E
continuam limitadas ao Supabase local; não remova essa proteção para testar em
produção. Configure Site URL/Redirect URLs e SMTP antes de abrir cadastros ao público.
O vínculo GitHub automático ainda depende da Login Connection da Vercel descrita acima.
