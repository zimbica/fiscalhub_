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

Fontes para o validador completo e catálogo das próximas etapas:

- [Portal Nacional da NF-e](https://www.nfe.fazenda.gov.br/portal/).
- [Validador SEFAZ-RS](https://www.sefaz.rs.gov.br/nfe/nfe-val.aspx).
- [Base Oobj](https://oobj.com.br/bc/).

Esses links não significam que schemas ou artigos já foram baixados, homologados ou catalogados nesta etapa.

## Etapa 3: XML e análise

- [Saxes](https://github.com/lddubeau/saxes): parser com namespaces, eventos de erro e rejeição de DOCTYPE na aplicação; README da versão instalada revisado.
- [zip.js](https://gildas-lormeau.github.io/zip.js/api/): `ZipReader`, entradas incrementais, `checkCrc32`, limites de fluxo e validação de caminhos; processamento em Web Worker próprio.
- [Decimal.js](https://mikemcl.github.io/decimal.js/): aritmética decimal e conversão explícita de escala.
- [Recharts](https://github.com/recharts/recharts): composição de gráficos, eixos e tooltips; documentação do pacote instalado revisada.
- [write-excel-file](https://github.com/catamphetamine/write-excel-file): API v4 `toBuffer()` e células de texto para preservar identificadores e decimais.
- [MOC 7, Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf): leiaute, chave, protocolos e conferência de produtos/descontos. As verificações restritas implementadas estão documentadas em [XML](xml-imports.md).
- [NT 2018.004](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=DEisbx2XCIs%3D): evento 110112 de cancelamento por substituição de NFC-e.

A presença de grupos da reforma tributária é preservada na extração; não foram inferidas regras de vigência nem homologado um pacote XSD nesta entrega.

## Etapa 4 — revisadas em 23/10/2026

- [Portal Nacional: schemas oficiais](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D) e [SVRS: documentos](https://dfe-portal.svrs.rs.gov.br/Nfe/Documentos): links exatos, hashes e composição em `schemas/manifest.json` e `docs/xml-validation.md`.
- [xmllint-wasm](https://github.com/noppa/xmllint-wasm): API e protocolo do worker 5.3.0; libxml2 2.13.8 confirmado pelo motor instalado.
- [CodeMirror](https://codemirror.net/docs/): editor, compartimentos, diagnósticos e busca.
- [xml-formatter](https://github.com/chrisbottin/xml-formatter): formatação de prévia, sem substituir original assinado.
- Next.js 16.4.2, documentação instalada de Route Handlers, `serverExternalPackages` e `outputFileTracingIncludes`.
- [MOC 7 Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf): chave, campos, direção/totais e exceções; IBS usa estrutura do XSD 010f e não é atribuído ao MOC anterior à reforma.

## Etapa 5 — revisadas em 23/10/2026

- MOC 7.0, Anexo I: D01, I08-70, 2B08-10, W16-10, seção 4.3, NA01-20, I08-40 e I08-04. Matriz de modelos e limites em `docs/rejections.md`.
- Artigos Oobj 215, 521, 539, 610, 656, 694, 732 e 770, lidos nas URLs exatas registradas em `catalog/rejections.json`. Resumos próprios; exemplos fiscais externos não copiados.
- Supabase changelog de 23/10/2026 e documentação atual de Full Text Search/RPC/security invoker; PostgreSQL `pg_trgm` para aproximação.
- Next.js 16.4.2: documentação instalada de Route Handlers, autenticação repetida na fronteira dos dados e cache privado.
