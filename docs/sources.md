# Documentação consultada

Revisão em 22/10/2026. As versões efetivamente usadas estão fixadas em `package.json` e `package-lock.json`.

- [Next.js — autenticação](https://nextjs.org/docs/app/guides/authentication): validação no servidor e autorização junto aos dados.
- [Supabase — SSR com Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client): clientes server/browser, cookies e proxy de renovação.
- [Supabase — tutorial de gestão de usuários](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs): confirmação de e-mail, perfil e sessão.
- [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): isolamento, índices e políticas.
- [Supabase — segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api): grants explícitos além de RLS.
- [Mudança nos grants da Data API](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): tabelas novas exigem opt-in de acesso.
- [Templates de e-mail no Free](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier): novos projetos gratuitos com SMTP padrão não personalizam templates; por isso o fluxo usa templates padrão.
- [Mudanças de TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated): uso de clientes modernos com TLS atual.
- [Atualização PostgreSQL 17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes): não usamos ltree, cifras PGP legadas, btree_gist float ou operadores personalizados afetados.
- [shadcn/ui — Next.js](https://ui.shadcn.com/docs/installation/next): instalação e componentes pelo CLI oficial.
- [Vercel Hobby](https://vercel.com/docs/plans/hobby): uso pessoal/não comercial e limites gratuitos.

Para a etapa 2, também foram revisados BrasilAPI (documentação e código do provedor), manual oficial de DV do CNPJ, CCC e cadastro SEFAZ-RS. Links, contrato e limites estão em [provedores cadastrais](company-providers.md).

Fontes fiscais indicadas para as próximas etapas, ainda sem regras implementadas:

- [Portal Nacional da NF-e](https://www.nfe.fazenda.gov.br/portal/).
- [Validador SEFAZ-RS](https://www.sefaz.rs.gov.br/nfe/nfe-val.aspx).
- [Base Oobj](https://oobj.com.br/bc/).

Esses links não significam que schemas ou artigos já foram baixados, homologados ou catalogados nesta etapa.
