# Verificação das Etapas 1–3

Executada em 22–23/10/2026, com Node.js 24.19, Next.js 16.4.2 e Supabase local PostgreSQL 17.11. Os testes acessam Auth, PostgREST e Storage reais; não são mocks dessas integrações.

| Verificação | Resultado |
|---|---|
| ESLint | Passou |
| TypeScript / geração de rotas Next.js | Passou |
| Vitest | 87 testes passaram |
| Integração Node.js / Supabase | 34 cenários passaram (37 resultados contando três agrupadores) |
| Playwright Chromium | 6 fluxos passaram; 2 opt-in ignorados no conjunto padrão |
| Playwright volume opt-in | 1.000 XMLs com pausa/retomada e limpeza final: passou em aproximadamente 2,4 minutos |
| Build Next.js de produção | Passou |
| npm audit --omit=dev | 0 vulnerabilidades reportadas |
| SQL lint `public,private` | Sem erros |
| Advisor de segurança local | Sem problemas no nível verificado |
| Advisor de desempenho local | Sem avisos/erros |
| Supabase remoto | 5 migrations conferidas, 19 tabelas com RLS e bucket privado; advisors sem WARN/ERROR |

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
- CI da fundação também passou no GitHub Actions. O teste externo é opt-in (`REAL_CNPJ_TEST=1`). Na etapa 3, o CI padrão executa seis fluxos e ignora dois testes opt-in (consulta externa e lote de mil XMLs).

## Cobertura XML adicionada

- NF-e/NFC-e, namespaces, decimal exato, soma de produtos ICMS com `indTot`, exclusão de ISSQN, descontos e alerta aritmético limitado de `vNF`.
- XML malformado, DOCTYPE/XXE, namespace incorreto, data impossível, excesso de profundidade/tamanho, grupos e itens duplicados, campos essenciais ausentes.
- ZIP real, subdiretórios, bytes preservados, CRC, caminhos inseguros, expansão excessiva e arquivos ignorados.
- Eventos vinculados/não vinculados, pedido sem resposta, autorização posterior, cancelamento, devolução independente e evento anterior à nota.
- Gravação atômica, rollback, duplicidade sob concorrência, conflitos, retomada idempotente, ambientes separados e RLS entre contas.
- Exclusão de evidência recalcula situação; exclusão de conta via Auth remove notas/eventos/recibos sem conceder privilégios adicionais ao serviço Auth.
- Relatórios filtrados, decimais preservados nos detalhes, CSV sem fórmula e XLSX real.
- Teste opt-in com 1.000 XMLs em ZIP: processamento no navegador, pausa e retomada, 1.000 notas persistidas, zero erros e soma exata de R$ 300,00. A execução inicial levou aproximadamente 158 segundos localmente. Ela revelou uma falha na limpeza da conta ao final, posteriormente corrigida e coberta por teste de integração explícito. A execução completa foi repetida após a correção: passou em aproximadamente 2,4 minutos, incluindo remoção da conta, dos recibos, documentos e objetos; a conferência final encontrou zero registros temporários nessas entidades.
- As cinco migrations foram reaplicadas do zero no Supabase local antes da verificação final. O CLI encontrou timeout no healthcheck do Storage causado pelo proxy deste ambiente; schema, API Storage e testes foram verificados diretamente.

Fixtures e resultados esperados: `tests/fixtures/xml/README.md`. Os arquivos são exclusivamente sintéticos.

## Problemas encontrados e corrigidos

- Consulta externa neste ambiente precisava do proxy configurado para Node.js e de identificação explícita do aplicativo no User-Agent. O fluxo ao vivo foi repetido e passou sem desativar TLS.
- Formulário de CNPJ no celular passou a empilhar campo e botão, preservando a leitura do identificador completo.
- Sidebar não rolava em telas baixas, impedindo alcançar logout. Adicionada rolagem vertical.
- Seletores de testes confundiam o anúncio de rota do Next.js com mensagens do formulário; passaram a selecionar a região correta.
- Ajustada interoperabilidade ESM/CommonJS do carregamento de ambiente do Playwright.
- O CLI do shadcn introduzia dependências de ferramenta com avisos de segurança. Removido do pacote da aplicação após gerar os componentes; variantes CSS necessárias ficaram locais. Não foi feito downgrade silencioso de bibliotecas.

## Limites da verificação

- Verificação criptográfica de assinatura, regras fiscais completas por UF/vigência continuam pendentes; a pesquisa de rejeições foi implementada na etapa 5. Fixtures de extração não alegam conformidade XSD; as novas fixtures em `tests/fixtures/xsd` exercitam explicitamente schemas oficiais, com placeholders de assinatura sem validade criptográfica.
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
# Opcional: volume local com pausa e retomada
BULK_XML_TEST=1 npm run test:e2e -- tests/e2e/documents.spec.ts --grep "mil XMLs"
# Opcional: inclui a fonte externa real
REAL_CNPJ_TEST=1 npm run test:e2e -- tests/e2e/companies.spec.ts
```

Os testes de integração e navegador recusam executar contra um host Supabase remoto. Relatórios/capturas locais ficam ignorados pelo Git.

## Etapa 4 — validação XSD real (23/10/2026)

- `npm run check`: hashes/dependências de 14 XSDs, ESLint, TypeScript, **106 testes unitários** e build aprovados. O build verifica que todos os XSDs, worker Node e WASM constam do rastreamento da função.
- `npm run test:integration`: **43 testes aprovados** (39 casos mais quatro grupos), incluindo persistência transacional, isolamento entre usuários, rollback, proteção do catálogo e exclusão de issues.
- `npm run db:check`: sem erros. As seis migrations foram aplicadas do zero no banco local; o CLI terminou com timeout do healthcheck de Storage no ambiente gerenciado, não com erro de migration. As APIs, integração e navegador foram testados novamente após a recriação.
- Suíte completa E2E com `E2E_PRODUCTION=1`: **7 cenários aprovados**, 2 opcionais não executados nesta rodada (BrasilAPI ao vivo e mil XMLs, já registrados na etapa 3). E2E do validador: aprovado usando **next start**, não servidor de desenvolvimento. Exercita upload, formato/bruto, schema real, erro de obrigatoriedade, navegação à linha, relatório/original privado, ausência de sessão, edição explícita de cópia, histórico, celular com rolagem interna, exclusão, carregamento do documento importado e preservação da validação após excluir esse documento.
- `npm audit --omit=dev --audit-level=moderate`: nenhuma vulnerabilidade reportada nesta execução. Não substitui auditoria independente.
- Supabase remoto: migration `20261023125337_xml_validation` aplicada e registro conciliado após comparação de MD5 do SQL; schemas registrados com hashes do manifesto, advisors sem WARN/ERROR. Restam os INFO já documentados.

Os testes XSD incluem modelos 55/65, eventos 110111, grupos IBS/CBS, ordem, obrigatoriedade, duplicação de tags, XML malformado/XXE, pacote não disponível, prazo do worker e regras aritméticas com Decimal. Arquivos sintéticos para teste manual: `tests/fixtures/xsd/`. Assinaturas placeholders não têm validade criptográfica.

```bash
npm run build
E2E_PRODUCTION=1 npm run test:e2e
```

O workflow CI passou a executar o navegador contra o build de produção. O domínio Vercel ainda não foi publicado nem homologado.

## Etapa 5 — catálogo e pesquisa (23/10/2026)

- `npm run check`: catálogo editorial, integridade de schemas, lint, TypeScript, **121 testes unitários** e build aprovados.
- `npm run test:integration`: **51 testes aprovados** (46 casos e cinco grupos) no Supabase local, incluindo código/texto/aproximação/alias, modelos, paginação, metacaracteres, favoritos idempotentes, histórico privado, catálogo somente leitura e rejeição de sessão revogada.
- Instalação limpa: oito migrations aplicadas do zero. O CLI ainda termina com o timeout de healthcheck de Storage específico deste ambiente; integração e APIs voltaram a funcionar e foram testadas depois. `npm run db:check` sem erros.
- `E2E_PRODUCTION=1 npm run test:e2e`: **8 cenários aprovados**, 2 opcionais não executados nesta rodada (BrasilAPI ao vivo e lote de mil XMLs). Inclui regressão das etapas 1–4.
- Atualização editorial repetida no banco local: mesmos oito IDs, sem duplicar entradas. O gerador reproduz exatamente o SQL versionado e recusa arquivo de saída não vazio.
- Supabase remoto: migrations `20261023164911_rejection_search` e `20261023164912_rejection_catalog_initial` aplicadas, hashes de SQL conferidos antes de alinhar registros. Oito entradas, 16 fontes, nenhuma WARN/ERROR nos advisors; INFO de índices sem uso e limitador privado continuam esperados.

O teste de navegador da etapa percorre pesquisa, página de explicação/fontes, cópia real para clipboard, favoritos, filtros, erro de digitação, identificação de ERP, código desconhecido, mensagem ambígua, ausência de sessão, origem inválida, segunda conta sem acesso a dados privados, limpeza com confirmação e responsividade. Mensagem com chave sintética não fica persistida no histórico.

As entradas são conteúdo editorial referenciado, não testes de conformidade tributária completa. Não houve varredura/cópia integral de artigos nem requisições às fontes durante a pesquisa do usuário.

## Etapa 6 — verificação de implantação (23/10/2026)

Adicionado `npm run deploy:check`, verificador offline de configuração de produção,
e sete testes em `tests/deployment/preflight.test.mjs`. Cobertura: variáveis
obrigatórias, URLs HTTPS, chaves trocadas/expostas, JWT legado service_role,
segredo fraco, configuração parcial de IE e saída de erro sem valores sensíveis.

Executado nesta revisão: `npm run check` aprovado (7 testes de implantação,
121 testes unitários, catálogo, integridade dos 14 schemas, lint, TypeScript,
build e rastreamento do worker/WASM). `npm audit --omit=dev --audit-level=moderate`
retornou zero vulnerabilidades conhecidas. CI da etapa 5, execução `39992419007`,
confirmado com conclusão `success`.

Não houve mudança em aplicação, SQL ou políticas nesta revisão; integração e
E2E não foram repetidos. Os resultados anteriores estão registrados acima.
A verificação usa dados sintéticos e não comprova credenciais de produção.
Publicação e testes no domínio Vercel permanecem pendentes.
