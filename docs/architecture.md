# Arquitetura — FiscalHub

## Estado desta entrega

Etapas 1–5 implementadas, com escopo e limites documentados. Importação, persistência, filtros, gráficos e exportações usam dados reais do usuário. Validador XSD executa schemas oficiais locais; catálogo inicial de rejeições tem fontes oficiais e Oobj revisadas.

## Decisões

- Next.js App Router, React e TypeScript. Route Handlers executam autenticação, perfil, preferências, consultas cadastrais, parsing e análise de documentos no runtime Node.js da Vercel.
- Supabase Auth é o único sistema de identidade. Cookies SSR com `@supabase/ssr`; `proxy.ts` renova tokens com `getClaims`; acesso a dados usa `getUser` e verificação de sessão ativa no banco.
- Todo registro privado pertence a `profiles.id`, vinculado a `auth.users.id`. Políticas combinam `auth.uid()` e existência da sessão. `user_metadata` nunca concede privilégios.
- Relacionamentos entre registros privados usam FKs compostas `(user_id,id)`, impedindo itens, consultas ou validações de apontarem para dados de outro proprietário.
- `profiles.role` prepara papéis `user/admin`. Usuários só têm `UPDATE(full_name)`. Nenhuma interface ou endpoint concede o papel administrativo nesta etapa.
- `schema_versions`, catálogo e fontes de rejeição têm leitura autenticada; somente operações administrativas podem alimentar essas tabelas. Nenhum artigo ou regra foi inventado para preenchê-las.
- `numeric(18,2)` para totais; `numeric(21,10)` para quantidades e valores unitários. Agregação monetária retorna string decimal e formatação usa `BigInt`. Tributos e grupos complementares são preservados em JSONB; totais suportados são extraídos sem duplicar valores de grupos pais e filhos.
- Eventos independem da existência prévia da NF-e. Autorização, cancelamento e finalidade de devolução têm campos diferentes. A classificação é recalculada a partir dos recibos e eventos restantes quando uma evidência é excluída.
- Supabase Storage: bucket `fiscal-xml` privado, 5 MiB por objeto, prefixo do usuário, sem permissão de atualização/upsert. O importador limita cada XML a 2 MiB e descompacta ZIP em Web Worker, enviando um XML por requisição.
- UI em português, shadcn/ui gerado pelo CLI oficial, Lucide e Tailwind 4. Aparência é persistida no banco e aplicada via `next-themes`. A pesquisa global atual localiza páginas; a pesquisa de documentos fica em `/documentos`.

## Camadas

```text
src/app/                  páginas, layouts e Route Handlers
src/components/           autenticação, navegação, dashboard e configurações
src/components/ui/        componentes shadcn/ui
src/lib/auth/             validação de entradas e sessão
src/lib/supabase/         clientes SSR, browser e administrativo
src/services/             exclusão de conta, limitador e consultas do workspace
src/types/database.ts     tipos gerados do PostgreSQL real
supabase/migrations/      schema, índices, funções, grants, RLS e Storage
tests/                    testes unitários, integração e navegador
docs/                     arquitetura, implantação, fontes e resultados
```

## APIs implementadas

| Método | Rota | Finalidade |
|---|---|---|
| POST | `/api/auth/login` | Login com senha |
| POST | `/api/auth/signup` | Cadastro real |
| POST | `/api/auth/recovery` | Envio do link de recuperação |
| POST | `/api/auth/password` | Atualização da senha e logout global |
| POST | `/api/auth/logout` | Logout global |
| POST | `/api/auth/delete` | Reautenticação, revogação, exclusão dos arquivos e usuário |
| PATCH | `/api/profile` | Atualização do nome |
| PATCH | `/api/settings` | Atualização de tema e cor |
| GET | `/auth/callback` | Troca do código PKCE por sessão |
| POST | `/api/companies` | Consulta CNPJ, cache e atualização manual |
| GET | `/api/companies` | Histórico pesquisável, paginação e filtro de favoritos |
| PATCH | `/api/companies/[id]` | Favoritar/desfavoritar consulta própria |
| DELETE | `/api/companies/[id]` | Excluir cache e consultas relacionadas próprias |

Respostas: `{ data: ... }` ou `{ error: { code, message } }`. Limite de JSON: 8 KiB; upload XML usa streaming limitado a 2 MiB. Mutação exige origem exatamente igual a `NEXT_PUBLIC_APP_URL`. Rotas autenticadas validam a sessão no servidor. Não usar cache público/ISR nas rotas com cookies.

## Consulta cadastral

`services/providers` define contratos intercambiáveis. BrasilAPI é a fonte padrão de CNPJ; o adaptador de IE só usa um gateway HTTPS explicitamente configurado. A transação `save_company_query` atualiza o cache, substitui IEs e registra a consulta; falhas revertem todo o conjunto. Não guarda QSA nem CPF de sócios. Detalhes em [provedores](company-providers.md).

## Importação e relatórios

- `services/xml`: árvore Saxes com namespaces e extração fiscal; `decimal.js` para cálculos, originais imutáveis.
- `workers/import.worker.ts` e `lib/documents/archive.ts`: descompactação limitada com contrapressão; o navegador espera cada persistência antes de enviar o próximo arquivo.
- `services/documents.ts`: Storage privado, chamadas RPC, relatórios e exclusão em blocos de 50 recibos.
- `import_files`: proveniência por lote/arquivo; `save_import_file` grava nota, itens, pagamentos e recibo em uma transação. Bloqueios impedem duplicação sob concorrência.
- RPCs `document_report` e `document_details` executam com privilégios do usuário e RLS. Valores decimais saem como texto. Gráficos convertem para número somente na apresentação.
- A exclusão de um lote preserva documentos que ainda tenham originais em outro lote. A exclusão de documento remove seus recibos e eventos identificados; a exclusão de conta também limpa Storage antes da cascata Auth.

| Método | Rota | Finalidade |
|---|---|---|
| GET/POST | `/api/imports` | Listar/criar lotes |
| GET/PATCH/DELETE | `/api/imports/[id]` | Recibos paginados, estado e exclusão retomável |
| POST | `/api/imports/[id]/files` | Importar um XML original |
| POST | `/api/imports/[id]/rejections` | Registrar falha de arquivo no lote |
| GET | `/api/documents` | Indicadores, gráficos e linhas filtradas |
| GET/DELETE | `/api/documents/[id]` | Detalhes e exclusão retomável |
| GET | `/api/documents/export` | CSV/XLSX filtrados, até 5.000 documentos |
| GET | `/api/import-files/[id]` | Download autenticado do original |

Veja [regras, limites e evidências](xml-imports.md).

## Plano das próximas etapas

6. Revisão de acessibilidade, desempenho, segurança e implantação; verificador offline de configuração em `scripts/deployment-preflight.mjs` implementado. Publicação e testes no domínio final ainda pendentes. Os testes atuais não certificam regras fiscais nem conformidade tributária.

## Validação XML — etapa 4

`validators` separa seleção/integridade de schemas, worker libxml2/WASM, regras locais e composição de relatório. `services/validations.ts` controla concorrência, armazenamento e persistência transacional via RPC invoker. `components/validation` contém editor, resultados e histórico.

`GET/POST /api/validations` lista/executa; `GET/DELETE /api/validations/[id]` consulta/exclui; `?format=xml|json` baixa original/relatório. `?source=<import_file_id>` carrega original autorizado no servidor. Todas exigem sessão ativa; mutações exigem mesma origem.

O worker usa o protocolo interno fixado de xmllint-wasm 5.3.0 para permitir interrupção real por timeout. `Reflect.construct(Worker, ...)` preserva execução nativa do arquivo, evitando que Turbopack mova o worker para longe do WASM. `outputFileTracingIncludes` empacota XSDs e arquivos do motor no Route Handler; `serverExternalPackages` preserva a dependência. Upgrade exige teste do protocolo, timeout, build e E2E em produção.

Veja [escopo, fontes e regras](xml-validation.md).

## Catálogo de rejeições

`catalog/rejections.json` contém resumos próprios e referências; `catalog/contract.mjs` valida o pacote editorial e gera SQL de UPSERT preservando IDs. Migrations separam estrutura de busca e conteúdo inicial. `pg_trgm` complementa busca textual portuguesa; a RPC invoker retorna página, total e tipo de correspondência. `lib/rejections/query.ts` extrai códigos explícitos, detecta ambiguidade e minimiza histórico; a identificação textual confirmada exige descrição exata. `services/rejections.ts` aplica sessão/RLS e consulta dados reais. UI, endpoints e atualização documentados em [catálogo](rejections.md).
