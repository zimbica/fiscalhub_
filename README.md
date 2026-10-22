# FiscalHub

Plataforma fiscal brasileira construída por etapas com **Next.js, React, TypeScript, Tailwind, shadcn/ui e Supabase**.

**Entrega atual: Etapa 1 — Fundação.** Autenticação, perfil, preferências e isolamento de dados funcionais. Os módulos fiscais das etapas 2–6 ainda não estão implementados. Não há dados de demonstração no painel nem simulação de consultas ou XSD.

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

Para usar Supabase hospedado, copie `.env.example` para `.env.local` e configure as cinco variáveis, aplique a migration e ajuste as URLs de Auth conforme [implantação](docs/deployment.md). Sem configuração, a aplicação mostra a página de instalação; não inventa uma sessão nem permite acessar dados privados.

## Verificar

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
npm run test:integration
npx playwright install --with-deps chromium
npm run test:e2e
```

Integração e E2E exigem Supabase **local** em execução e `.env.local`. Recusam endpoints remotos para evitar escrever testes em produção. Os testes criam usuários/documentos sintéticos temporários e os removem. A integração testa o modelo do banco, não o parser XML, que ainda não existe.

Veja [resultados e cobertura](docs/testing.md), [arquitetura](docs/architecture.md), [segurança](docs/security.md) e [fontes consultadas](docs/sources.md).

## Próximas etapas

| Etapa | Escopo | Estado |
|---|---|---|
| 1 | Fundação, Auth, perfil, temas, banco e RLS | Implementada; verificar relatório dos testes |
| 2 | Consulta real de CNPJ, provedores de IE, cache e histórico | Pendente |
| 3 | XML/ZIP, extração NF-e/NFC-e/eventos, dashboards, filtros e exportação | Pendente |
| 4 | Editor XML, motor XSD real com schemas oficiais, regras fiscais e relatório | Pendente |
| 5 | Catálogo de rejeições revisado, fontes Oobj/oficiais, busca e favoritos | Pendente |
| 6 | Testes fiscais completos, otimização e publicação final | Pendente |

Validação local nunca será apresentada como autorização da SEFAZ. IE não será inferida da situação do CNPJ. O catálogo permanece vazio até haver referências revisadas. A estratégia de XSD será homologada no runtime da Vercel na etapa 4.

## GitHub, Supabase e Vercel

- Repositório: <https://github.com/zimbica/fiscalhub_>.
- Projeto Supabase indicado pelo proprietário: `kwgrlocfbkxbupydxmdu`.
- [Passo a passo de implantação](docs/deployment.md), incluindo variáveis, migrations, Auth, SMTP e planos gratuitos.

Nenhum serviço pago é necessário para desenvolver/testar localmente. Vercel Hobby permite uso pessoal e não comercial; uso comercial exige revisão do plano/termos. Supabase Free e SMTP possuem limites: custo zero depende de permanecer dentro das cotas e ter serviços de e-mail adequados. Não foram habilitados serviços pagos automaticamente.

**Nunca envie `.env.local`, credenciais ou XMLs reais ao repositório.** `.env.example` contém apenas nomes de variáveis. A integração do GitHub com o Supabase não aplica por si só as migrations nem configura a hospedagem da aplicação.
