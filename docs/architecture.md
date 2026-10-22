# Arquitetura — FiscalHub

## Estado desta entrega

Etapas 1 e 2 implementadas. As etapas 3 a 6 permanecem planejadas. O banco antecipa as entidades fiscais, mas **tabelas não equivalem a módulos implementados**. Não há validador XSD, importador de XML, catálogo de rejeições ou gráficos fictícios nesta entrega.

## Decisões

- Next.js App Router, React e TypeScript. Route Handlers executam autenticação, perfil, preferências e consultas cadastrais no runtime Node.js da Vercel.
- Supabase Auth é o único sistema de identidade. Cookies SSR com `@supabase/ssr`; `proxy.ts` renova tokens com `getClaims`; acesso a dados usa `getUser` e verificação de sessão ativa no banco.
- Todo registro privado pertence a `profiles.id`, vinculado a `auth.users.id`. Políticas combinam `auth.uid()` e existência da sessão. `user_metadata` nunca concede privilégios.
- Relacionamentos entre registros privados usam FKs compostas `(user_id,id)`, impedindo itens, consultas ou validações de apontarem para dados de outro proprietário.
- `profiles.role` prepara papéis `user/admin`. Usuários só têm `UPDATE(full_name)`. Nenhuma interface ou endpoint concede o papel administrativo nesta etapa.
- `schema_versions`, catálogo e fontes de rejeição têm leitura autenticada; somente operações administrativas podem alimentar essas tabelas. Nenhum artigo ou regra foi inventado para preenchê-las.
- `numeric(18,2)` para totais; `numeric(21,10)` para quantidades e valores unitários. Agregação monetária retorna string decimal e formatação usa `BigInt`. Campos tributários complementares ficam em JSONB até sua extração versionada na etapa 3.
- Eventos independem da existência prévia da NF-e. Autorização, cancelamento e finalidade de devolução têm campos diferentes. Nenhuma classificação é inferida pela fundação.
- Supabase Storage: bucket `fiscal-xml` privado, 5 MiB por objeto, prefixo do usuário, sem permissão de atualização/upsert. O controle de conteúdo XML/ZIP e processamento em lotes será implementado com o importador.
- UI em português, shadcn/ui gerado pelo CLI oficial, Lucide e Tailwind 4. Aparência é persistida no banco e aplicada via `next-themes`. A pesquisa global atual localiza páginas; busca de documentos será adicionada com o importador.

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

Respostas: `{ data: ... }` ou `{ error: { code, message } }`. Limite de corpo: 8 KiB. Mutação exige origem exatamente igual a `NEXT_PUBLIC_APP_URL`. Rotas autenticadas validam a sessão no servidor. Não usar cache público/ISR nas rotas com cookies.

## Consulta cadastral

`services/providers` define contratos intercambiáveis. BrasilAPI é a fonte padrão de CNPJ; o adaptador de IE só usa um gateway HTTPS explicitamente configurado. A transação `save_company_query` atualiza o cache, substitui IEs e registra a consulta; falhas revertem todo o conjunto. Não guarda QSA nem CPF de sócios. Detalhes em [provedores](company-providers.md).

## Plano das próximas etapas

3. Parser seguro, arquivos XML/ZIP com limites de tamanho/quantidade/expansão, fila em lotes curtos e retomada. Extração de modelos 55/65 e eventos, dashboard real com Recharts, filtros e exportações.
4. Homologar um motor XSD real compatível com Vercel, empacotar dependências oficiais e fixar hashes/versões. Avaliar WebAssembly/libxml2 com isolamento e limites. Testar `xs:include/import`, ordem, obrigatoriedade, namespaces e esquemas IBS/CBS. Não usar regex como validador XSD.
5. Catálogo pesquisável com resumos próprios, referências oficiais e links Oobj revisados, favoritos e histórico. Mecanismo de atualização permitido e versionado.
6. Testes fiscais completos, revisão de acessibilidade, desempenho, segurança e implantação. Os testes atuais não certificam regras fiscais nem conformidade tributária.
