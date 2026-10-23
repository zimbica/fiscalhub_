# FiscalHub

Plataforma fiscal brasileira construída por etapas com **Next.js, React, TypeScript, Tailwind, shadcn/ui e Supabase**.

**Entrega atual: Etapas 1–5 — Fundação, consulta cadastral, XML e pesquisa de rejeições.** Autenticação, CNPJ, importação de XML/ZIP, gráficos, exportações e validador XSD real funcionais. Catálogo inicial com oito rejeições revisadas, busca, favoritos e histórico. Não há dados de demonstração no painel nem simulação de consultas ou XSD.

## Implementado

- Cadastro, login, logout global, confirmação de e-mail e recuperação de senha via Supabase Auth.
- Sessão SSR, proteção de páginas/endpoints e bloqueio de JWT de sessão revogada nas políticas RLS.
- Perfil individual, papel `user/admin` preparado sem permitir autoelevação e alteração do nome.
- Temas claro/escuro/sistema, azul/roxo e preferências persistidas por usuário.
- Exclusão da própria conta com confirmação e reautenticação, limpeza de arquivos e dados associados.
- Interface responsiva, sidebar, busca de páginas com Ctrl/Cmd+K, toasts, estados vazios e carregamento.
- Painel com indicadores consultados do banco e histórico real com filtro e paginação.
- Modelagem inicial das entidades fiscais, índices, valores decimais, vínculos por proprietário e bucket XML privado.
- Limites persistentes de requisição, validação server-side, proteção de origem, erros padronizados e segredos restritos ao servidor.
- Consulta real de CNPJ pela BrasilAPI, dados normalizados e fontes por campo; validação de dígitos numéricos e alfanuméricos.
- Cache privado por 24 horas, atualização manual, fallback identificado, histórico pesquisável, favoritos e exclusão.
- IE separada do CNPJ: links oficiais e adaptador opcional para provedor autorizado, sem inferir inscrição ou situação.
- Importação de NF-e/NFC-e 4.00 e eventos individuais em XML/ZIP, arrastar e soltar, progresso, pausa e retomada idempotente.
- Extração de itens, partes, pagamentos, tributos e grupos IBS/CBS; originais privados e histórico dos lotes.
- Duplicidade por usuário/chave/ambiente, conflito de conteúdo e situação derivada das evidências importadas.
- Dashboard Recharts, filtros avançados, tabela paginada, detalhes, CSV e Excel; exclusão de documentos/lotes com confirmação.
- Proteções XXE, profundidade, tamanho, expansão ZIP e cálculos decimais exatos.
- Validador com editor CodeMirror, 14 XSDs oficiais fixados, motor libxml2/WASM, seis regras locais condicionais, relatório JSON, histórico privado e preservação de originais.
- Consulta de rejeições por código/texto/aproximação, identificação conservadora de mensagens ERP, fontes oficiais/Oobj, favoritos, histórico e atualização editorial por migration.
- Testes unitários, integração com Supabase real, navegador e workflow CI.

## Rodar localmente

Requisitos: Node.js 24 LTS, npm, Git e Docker para o Supabase local.

```bash
git clone https://github.com/zimbica/fiscalhub_.git
cd fiscalhub_
npm ci
npm run db:start
npm run setup:local
npm run dev
```

Abra <http://localhost:3000>. Os e-mails de confirmação/recuperação locais ficam no Mailpit em <http://localhost:54324>. Abra o link no mesmo navegador do cadastro ou pedido de recuperação. Nenhum e-mail local é enviado à internet.

`setup:local` cria `.env.local` com credenciais do Supabase **local**, sem imprimi-las, e recusa sobrescrever um arquivo existente. Não use essas credenciais no deploy. As migrations são aplicadas ao iniciar/resetar o banco local. `db:reset` apaga os dados locais; use apenas no ambiente de desenvolvimento.

Para usar Supabase hospedado, copie `.env.example` para `.env.local` e configure as cinco variáveis obrigatórias, aplique as migrations e ajuste as URLs de Auth conforme [implantação](docs/deployment.md). Sem configuração, a aplicação mostra a página de instalação; não inventa uma sessão nem permite acessar dados privados.

## Verificar

```bash
npm run test:deployment
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
npm run test:integration
npx playwright install --with-deps chromium
npm run test:e2e
```

Integração e E2E exigem Supabase **local** em execução e `.env.local`. Recusam endpoints remotos para evitar escrever testes em produção. Os testes criam usuários/documentos sintéticos temporários e os removem. O parser é testado com arquivos sintéticos; as fixtures de validação também testam XSD real, sem certificar assinatura ou autorização SEFAZ.

Detalhes e limitações das fontes: [consulta de CNPJ e IE](docs/company-providers.md). As duas variáveis `IE_PROVIDER_*` são opcionais. Não é necessário contratar um serviço para consultar CNPJ.

Consulte [importação XML, regras de extração e limites](docs/xml-imports.md). O teste opcional de mil XMLs é executado com `BULK_XML_TEST=1 npm run test:e2e -- tests/e2e/documents.spec.ts --grep "mil XMLs"`.

Veja [resultados e cobertura](docs/testing.md), [arquitetura](docs/architecture.md), [segurança](docs/security.md) e [fontes consultadas](docs/sources.md).

Consulte o [validador XML, schemas instalados e limites](docs/xml-validation.md).

## Próximas etapas

| Etapa | Escopo | Estado |
|---|---|---|
| 1 | Fundação, Auth, perfil, temas, banco e RLS | Implementada; verificar relatório dos testes |
| 2 | Consulta real de CNPJ, provedores de IE, cache e histórico | Implementada; IE automática depende de fonte autorizada |
| 3 | XML/ZIP, extração NF-e/NFC-e/eventos, dashboards, filtros e exportação | Implementada; veja limites de arquivos e evidências |
| 4 | Editor XML, XSD oficial real, regras locais condicionais, histórico e relatório | Implementada no escopo de [validação](docs/xml-validation.md) |
| 5 | Catálogo de rejeições revisado, fontes Oobj/oficiais, busca e favoritos | Implementada; [cobertura e atualização](docs/rejections.md) |
| 6 | Revisão, testes e preparação para publicação | Em andamento; verificador de configuração implementado, publicação pendente |

Validação local nunca será apresentada como autorização da SEFAZ. IE não será inferida da situação do CNPJ. O catálogo inicial é limitado às oito entradas revisadas; não representa todas as rejeições. O motor usa libxml2/WASM no runtime Node; publicação e verificação no domínio Vercel ainda dependem da configuração de implantação.

## GitHub, Supabase e Vercel

- Repositório: <https://github.com/zimbica/fiscalhub_>.
- Projeto Supabase indicado pelo proprietário: `kwgrlocfbkxbupydxmdu`; migrations versionadas em `supabase/migrations`; situação da aplicação remota em [implantação](docs/deployment.md).
- Publicação Vercel, variáveis secretas e URLs/SMTP de Auth ainda precisam da configuração descrita abaixo.
- [Passo a passo de implantação](docs/deployment.md), incluindo variáveis, migrations, Auth, SMTP e planos gratuitos.

Nenhum serviço pago é necessário para desenvolver/testar localmente. Vercel Hobby permite uso pessoal e não comercial; uso comercial exige revisão do plano/termos. Supabase Free e SMTP possuem limites: custo zero depende de permanecer dentro das cotas e ter serviços de e-mail adequados. Não foram habilitados serviços pagos automaticamente.

**Nunca envie `.env.local`, credenciais ou XMLs reais ao repositório.** `.env.example` contém apenas nomes de variáveis. A integração do GitHub com o Supabase não aplica por si só as migrations nem configura a hospedagem da aplicação.
