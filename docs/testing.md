# Verificação da Etapa 1

Executada em 22/10/2026, com Node.js 24.19, Next.js 16.4.2 e Supabase local PostgreSQL 17.11. Os testes acessam Auth, PostgREST e Storage reais; não são mocks dessas integrações.

| Verificação | Resultado |
|---|---|
| ESLint | Passou |
| TypeScript / geração de rotas Next.js | Passou |
| Vitest | 25 testes passaram |
| Integração Node.js / Supabase | 12 cenários passaram (13 resultados contando o teste agrupador) |
| Playwright Chromium | 4 fluxos passaram, desktop e viewport móvel |
| Build Next.js de produção | Passou |
| npm audit --omit=dev | 0 vulnerabilidades reportadas |
| SQL lint `public,private` | Sem erros |
| Advisor de segurança local | Sem problemas no nível verificado |
| Advisor de desempenho local | Sem avisos/erros |

## Cobertura efetivamente executada

- Cadastro, validação de confirmação de senha e envio de e-mail local.
- Abertura do link real de confirmação pelo navegador e troca de código PKCE.
- Login inválido/válido, bloqueio de rotas/endpoints e origem externa.
- Recuperação pelo e-mail real do Mailpit, troca de senha, novo login e logout.
- Atualização de nome; persistência de tema escuro/claro e cor roxa após reload.
- Histórico, busca de páginas, navegação em viewport móvel e ausência de overflow horizontal na tela verificada.
- Exclusão via interface, senha/confirmação e inexistência posterior do usuário no Auth.
- RLS: leitura e atualização entre usuários, elevação de privilégio e alteração de proprietário negadas.
- Relação de item com documento de outro proprietário negada por FK composta.
- Duplicidade de chave dentro de uma conta bloqueada; a mesma chave em contas diferentes permitida.
- Documento sintético armazenado como `unconfirmed`, sem autorização inventada; soma decimal do painel.
- Bucket privado: acesso público/por outra conta negado, exclusão indevida sem efeito e sobrescrita bloqueada.
- Limitação de requisição atômica sob concorrência.
- JWT de sessão revogada impedido de ler documentos diretamente na Data API.

## Problemas encontrados e corrigidos

- Sidebar não rolava em telas baixas, impedindo alcançar logout. Adicionada rolagem vertical.
- Seletores de testes confundiam o anúncio de rota do Next.js com mensagens do formulário; passaram a selecionar a região correta.
- Ajustada interoperabilidade ESM/CommonJS do carregamento de ambiente do Playwright.
- O CLI do shadcn introduzia dependências de ferramenta com avisos de segurança. Removido do pacote da aplicação após gerar os componentes; variantes CSS necessárias ficaram locais. Não foi feito downgrade silencioso de bibliotecas.

## Limites da verificação

- Testes do motor fiscal (XML válido/inválido, XSD, namespaces, eventos, regras de negócio, totais fiscais, IE e rejeições) ainda pertencem às próximas etapas. Os documentos usados nos testes de RLS são registros sintéticos, não arquivos XML nem notas autorizadas.
- Não foi testada entrega de e-mail por SMTP externo; os fluxos usam Mailpit local.
- Não equivale a teste de carga, auditoria independente, homologação fiscal ou certificação LGPD.
- No ambiente gerenciado, o driver de imagens Docker exigiu consolidar a imagem oficial do PostgreSQL para evitar amplificação de disco. Os healthchecks de Auth/Storage recebiam 403 ao tentar o endereço local pelo proxy do ambiente; as APIs foram verificadas diretamente e os testes completos passaram. Em desenvolvimento comum/CI, use `supabase start` sem ignorar healthchecks.
- O build passou localmente. Deploy e autenticação no domínio final exigem a configuração remota descrita em `deployment.md`.

## Reproduzir

```bash
npm ci
npm run db:start
npm run setup:local
npm run check
npm run db:check
npx supabase db advisors --local --type security --level warn --fail-on error
npm run test:integration
npx playwright install --with-deps chromium
npm run test:e2e
```

Os testes de integração e navegador recusam executar contra um host Supabase remoto. Relatórios/capturas locais ficam ignorados pelo Git.
