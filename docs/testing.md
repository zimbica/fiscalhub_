# Verificação das Etapas 1 e 2

Executada em 22/10/2026, com Node.js 24.19, Next.js 16.4.2 e Supabase local PostgreSQL 17.11. Os testes acessam Auth, PostgREST e Storage reais; não são mocks dessas integrações.

| Verificação | Resultado |
|---|---|
| ESLint | Passou |
| TypeScript / geração de rotas Next.js | Passou |
| Vitest | 56 testes passaram |
| Integração Node.js / Supabase | 19 cenários passaram (21 resultados contando os dois agrupadores) |
| Playwright Chromium | 6 fluxos passaram, incluindo consulta externa real e viewport móvel |
| Build Next.js de produção | Passou |
| npm audit --omit=dev | 0 vulnerabilidades reportadas |
| SQL lint `public,private` | Sem erros |
| Advisor de segurança local | Sem problemas no nível verificado |
| Advisor de desempenho local | Sem avisos/erros |
| Supabase remoto | Três migrations conferidas, 18 tabelas com RLS e bucket privado; advisors sem WARN/ERROR |

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

## Cobertura cadastral adicionada

- CNPJ numérico e alfanumérico (exemplo oficial), DV incorreto e entradas malformadas.
- Contrato BrasilAPI, campos opcionais, regime histórico, descarte de QSA, divergência de identificador, timeout e limite de resposta.
- IE sem provedor, múltiplas inscrições via gateway de teste, ausência com fonte, confirmação sem evidência e URL insegura. O gateway é simulado; não houve consulta estadual automática real.
- Cache válido/expirado, atualização forçada, fallback sinalizado e 404 sem mascaramento.
- RPC com gravação atômica, rollback de falha, favoritos, isolamento entre usuários, FK e exclusão em cascata.
- Navegador: validação client/server, cache persistido, favoritos, pesquisa, copiar, exclusão e tela móvel.
- Consulta ao vivo pela interface à BrasilAPI para o CNPJ público do Banco do Brasil; resposta gravada no PostgreSQL local e IE exibida como não verificada. Usuário de teste removido ao final.
- CI da fundação também passou no GitHub Actions. O teste externo é opt-in (`REAL_CNPJ_TEST=1`), portanto o CI padrão executa cinco fluxos e marca esse sexto como ignorado.

## Problemas encontrados e corrigidos

- Consulta externa neste ambiente precisava do proxy configurado para Node.js e de identificação explícita do aplicativo no User-Agent. O fluxo ao vivo foi repetido e passou sem desativar TLS.
- Formulário de CNPJ no celular passou a empilhar campo e botão, preservando a leitura do identificador completo.
- Sidebar não rolava em telas baixas, impedindo alcançar logout. Adicionada rolagem vertical.
- Seletores de testes confundiam o anúncio de rota do Next.js com mensagens do formulário; passaram a selecionar a região correta.
- Ajustada interoperabilidade ESM/CommonJS do carregamento de ambiente do Playwright.
- O CLI do shadcn introduzia dependências de ferramenta com avisos de segurança. Removido do pacote da aplicação após gerar os componentes; variantes CSS necessárias ficaram locais. Não foi feito downgrade silencioso de bibliotecas.

## Limites da verificação

- Testes do motor fiscal (XML válido/inválido, XSD, namespaces, eventos, regras de negócio, totais fiscais e rejeições) ainda pertencem às próximas etapas. Os documentos usados nos testes de RLS são registros sintéticos, não arquivos XML nem notas autorizadas.
- Não foi testada entrega de e-mail por SMTP externo; os fluxos usam Mailpit local.
- Não equivale a teste de carga, auditoria independente, homologação fiscal ou certificação LGPD.
- No ambiente gerenciado, o driver de imagens Docker exigiu consolidar a imagem oficial do PostgreSQL para evitar amplificação de disco. Os healthchecks de Auth/Storage recebiam 403 ao tentar o endereço local pelo proxy do ambiente; as APIs foram verificadas diretamente e os testes completos passaram. Em desenvolvimento comum/CI, use `supabase start` sem ignorar healthchecks.
- O build passou localmente. As migrations já estão no Supabase remoto; deploy, variáveis e autenticação no domínio final exigem a configuração restante descrita em `deployment.md`. Os INFO remotos de índices sem uso no banco vazio e RLS sem política no limitador privado são esperados.

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
# Opcional: inclui a fonte externa real
REAL_CNPJ_TEST=1 npm run test:e2e -- tests/e2e/companies.spec.ts
```

Os testes de integração e navegador recusam executar contra um host Supabase remoto. Relatórios/capturas locais ficam ignorados pelo Git.
