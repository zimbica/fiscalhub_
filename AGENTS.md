# FiscalHub

- Interface, mensagens e documentação em português brasileiro.
- Entrega inicial é Etapa 1. Não apresentar recursos planejados como implementados.
- Leia README.md e docs/architecture.md antes de ampliar o projeto.
- Não adicionar dados de demonstração à aplicação ou catálogo fiscal sem fontes revisadas.
- Mantenha Supabase Auth como único sistema de autenticação. Nunca use user_metadata para autorização.
- Preserve RLS, FKs compostas por proprietário, bucket privado e bloqueio de sessões revogadas.
- Use valores decimais exatos para cálculos fiscais. Não classifique cancelamento/devolução/autorização sem evidência.
- XSD deve ser validação real com schemas oficiais e versões verificadas; não substitua por regex.
- Gere migrations pelo CLI, use tipos gerados do banco e nunca edite migrations já aplicadas em produção.
- Execute lint, TypeScript, testes relevantes e build. Testes de integração/E2E só podem apontar para Supabase local.
- Nunca versionar .env.local, credenciais, XMLs reais ou screenshots com dados sensíveis.
- Não habilitar serviços pagos ou alterar visibilidade do repositório sem instrução do proprietário.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
