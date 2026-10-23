# Validação XML — etapa 4

Abra **Validador de XML** após entrar. Envie/arraste um XML, cole o código ou carregue um original da análise de documentos. O editor CodeMirror oferece linhas, sintaxe, busca Ctrl/Cmd+F, indentação e navegação para inconsistências. A visualização formatada é somente uma prévia; o servidor valida os bytes originais. Para editar uma cópia, confirme o aviso de assinatura. Não há correção automática.

## O que é verificado

1. Estrutura: parser Saxes com namespace, UTF-8 e proibição de DTD/entidades externas.
2. XSD: libxml2 **2.13.8**, via **xmllint-wasm 5.3.0**, executa os schemas oficiais e suas dependências locais. O resultado mostra a mensagem original do motor, linha e, quando identificável sem ambiguidade, tag/XPath. Coluna não é inventada quando o motor não a fornece.
3. Regras locais versionadas em `src/validators/rules.ts`, executadas somente após aprovação XSD: DV de chave numérica, direção CFOP/tpNF, soma dos produtos ICMS incluídos em total; conferências de descontos, UFs/idDest e soma IBS estadual/municipal geram alertas para revisão. Cada regra documenta condições e fonte. Cálculos usam Decimal com precisão 48 e tolerância explícita de R$ 0,01.

Não são aplicadas regras universais de tributação nem inferida obrigatoriedade de IBS/CBS. A ausência de condição suficiente aparece como **não verificado**. Alertas não são rejeições comprovadas e não recebem códigos SEFAZ sem correspondência documentada.

## Schemas instalados e proveniência

| Estrutura | Modelo/versão | Schema inicial |
|---|---|---|
| `NFe` | 55/65, 4.00 | `nfe_v4.00.xsd` |
| `nfeProc` | 55/65, 4.00 | `procNFe_v4.00.xsd` |
| `evento`, `procEventoNFe` | cancelamento 110111, 1.00 | `eventoCancNFe_v1.00.xsd`, `procEventoCancNFe_v1.00.xsd` |

Pacote NF-e **PL 010f v1.04**, revisado em 23/10/2026, obtido diretamente do [Portal Nacional](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=8ITFuBLltXs%3D). Este ZIP incremental contém cinco arquivos. A raiz `procNFe_v4.00.xsd` é do [pacote oficial SVRS 009k](https://dfe-portal.svrs.rs.gov.br/NFE/DownloadArquivoEstatico/?sistema=NFE&tipoArquivo=2&nomeArquivo=PL_009k_NT2023_001_v120.zip), sem alteração, e inclui o leiaute 4.00 do pacote 010f instalado. Cancelamento usa o [pacote oficial 1.01/NT 2018.004](https://dfe-portal.svrs.rs.gov.br/NFE/DownloadArquivoEstatico/?sistema=NFE&tipoArquivo=2&nomeArquivo=Evento_Canc_PL_v1.01_NT_2018_004.zip).

Os 14 arquivos são preservados byte a byte; `schemas/manifest.json` registra SHA-256 de cada XSD e dos três ZIPs de origem. `npm run schemas:check` verifica hashes e dependências `xs:include/import`. O servidor verifica os hashes antes de executar. `schema_versions` mantém a composição e o hash do conjunto; cada relatório identifica o pacote efetivamente usado.

Leiaute 4.00 não identifica a revisão histórica de schema. O pacote instalado não certifica documentos contra todas as versões anteriores. Não se infere vigência legal pela data do download. Outros leiautes, mensagens e cancelamento 110112 são explicitamente não verificados por XSD nesta etapa.

## Segurança, persistência e limites

- XML até 2 MiB; relatório até 200 ocorrências; até 20 validações/minuto e 500/dia por usuário.
- Worker Node isolado por validação, WASM até 128 MiB, prazo de 15 segundos e até dois workers simultâneos por instância. Encerramento forçado em timeout; falha do motor retorna erro de serviço, nunca aprovação.
- `--nonet`, arquivos virtuais permitidos e nenhuma URL/caminho de schema obtidos do XML. DTD é rejeitado antes do motor.
- RLS por proprietário e FK composta de documento/usuário. RPC invoker salva relatório e ocorrências atomicamente; bucket privado guarda cópia imutável em `usuario/validations/id.xml`.
- Apagar o documento importado preserva o histórico de validação e sua cópia independente. Excluir a validação remove relatório/ocorrências e sua cópia. Exclusão de conta também remove seus arquivos privados.
- Histórico paginado, download de XML original e relatório JSON; auditoria de atividade sem gravar conteúdo fiscal em logs.

## Limites e próximos recursos

**Aprovação local não comprova autorização SEFAZ, assinatura digital, validade de certificado, enquadramento tributário ou conformidade completa com legislação.** A estrutura XMLDSig é validada pelo XSD; a criptografia não é verificada. Exemplos de testes usam assinatura/certificado fictícios claramente identificados.

Pendentes: regras completas por UF/vigência e Notas Técnicas, seleção histórica de pacotes, verificação criptográfica, validação em lote, relatório PDF, comparação de sugestões e vínculos ao catálogo de rejeições da etapa 5. A publicação efetiva na Vercel ainda exige credenciais/configuração do domínio; o runtime de produção Next.js pode ser testado localmente conforme `testing.md`.

## Atualizar um pacote

Baixe da fonte oficial, registre URL/hash/data de revisão e confira as Notas Técnicas. Preserve os bytes e dependências, atualize o manifesto e o seletor, adicione migration nova para `schema_versions`, mantenha referência dos pacotes anteriores e crie testes positivos/negativos das mudanças. Execute `npm run check`, integração e navegador em produção. Nunca substitua hashes em migrations já aplicadas ou atualize schemas silenciosamente.
