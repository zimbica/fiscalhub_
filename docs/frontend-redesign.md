# Reformulação do frontend — 27/10/2026

## Entrega

Interface exclusivamente escura, com preto/grafite, ações azuis, tipografia Geist, espaçamentos compactos e foco visível. Navegação lateral e menu móvel, cabeçalho, acesso por apelido, dashboard, CNPJ/IE, documentos, detalhes, gráficos, editor XML, validações, rejeições, histórico, configurações, privacidade, instalação, erros e diálogos seguem o mesmo padrão.

Removidos slogans, exemplos nos campos, instruções promocionais e rodapé repetitivo. Mensagens fiscais, limites técnicos, confirmações de exclusão e alertas sobre sessão/assinatura continuam presentes. Nenhum dado de demonstração foi adicionado.

A escolha anterior de tema/cor deixa de aparecer, conforme a exigência de modo escuro e azul exclusivos. A API de preferências e os registros antigos permanecem intactos. O editor XML recebeu cores de sintaxe próprias para fundo escuro, sem modificar o conteúdo validado.

## Compatibilidade

Nenhuma alteração nos Route Handlers, serviços, validadores fiscais, integrações, migrations, RLS ou banco. Importação XML/ZIP, retomada, filtros, exportações CSV/Excel, originais, consulta de empresas, favoritos, busca de rejeições, relatórios e validação XSD mantêm seus fluxos existentes. Disponibilidade e credenciais dos provedores externos continuam sujeitas à configuração já documentada.

## Verificação executada

- ESLint, TypeScript e build de produção: aprovados.
- Unitários: 161 aprovados.
- Integração com Supabase local: 55 aprovados, incluindo isolamento de usuários.
- Playwright com build de produção e Supabase local: 8 aprovados; 2 testes opt-in não executados (BrasilAPI ao vivo e carga de mil XMLs).
- Acessibilidade automática WCAG A/AA nas páginas públicas e principais áreas privadas, desktop e celular: sem violações detectadas. Isso não substitui auditoria manual completa.
- Inspeção visual das capturas de desktop e celular; tabelas roláveis acessíveis pelo teclado e ausência de transbordamento horizontal da página nas rotas verificadas.

Reproduzir: `npm run check`, `npm run test:integration` e `E2E_PRODUCTION=1 npm run test:e2e`, com Supabase local configurado conforme README. Não executar as suítes de integração/E2E contra produção.

## Publicação

- Código: commit `f255311`, enviado a `zimbica/fiscalhub_`.
- Vercel: `dpl_4hTqqsSP6BxKyXgY7b7tSzEzfGmL`, estado Ready e promovido para produção.
- Endereço: https://fiscalhub-beta.vercel.app
- Verificação pontual no site publicado: entrada HTTP 200, tema escuro, criação de sessão por apelido, persistência após recarga e abertura de documentos no celular sem transbordamento horizontal. Espaço temporário excluído ao terminar (HTTP 200).
