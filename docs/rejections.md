# Catálogo de rejeições — etapa 5

Acesse **Consulta de Rejeições** após entrar. A pesquisa consulta PostgreSQL real, com oito entradas iniciais: **215, 521, 539, 610, 656, 694, 732 e 770**. O catálogo não pretende cobrir todas as mensagens SEFAZ.

## Uso

- Pesquise código, parte da descrição, termos sem acentos ou uma grafia aproximada. Há filtro por modelo 55/65, favoritos e páginas de 12 registros.
- Em **Identificar mensagem do ERP**, cole até 500 caracteres. Código explícito conhecido ou descrição exata identifica uma entrada. Vários códigos geram ambiguidade; resultados aproximados são sugestões, nunca identificação confirmada. Um código explícito desconhecido não é substituído por outro apenas porque a descrição é parecida.
- Abra um resultado para significado, causas, orientação, campos XML, fontes, condições/exceções e rejeições relacionadas. Exemplo XML é um fragmento de diagnóstico, não uma correção universal.
- Favoritos e últimas 20 pesquisas são privados. Limpar histórico exige confirmação e preserva favoritos. A exclusão da conta remove ambos.
- O cabeçalho oferece atalho para pesquisar no catálogo. Falhas XSD no validador oferecem acesso à orientação 215, sem atribuir automaticamente esse código a todo erro local.

A tela não consulta a SEFAZ, não altera XMLs e não pesquisa a internet em tempo real. Links externos abrem as fontes originais por iniciativa do usuário.

## Fontes e cobertura editorial

Cada entrada possui resumo próprio, artigo Oobj e referência oficial. A conferência inicial usa **MOC 7.0 — Anexo I**, seção/regra indicada em cada referência; revisão editorial **2026-10-23.1**. O manual não consolida todas as Notas Técnicas posteriores: as orientações não são um motor de tributação vigente por UF/data. Não são inventadas datas de início/fim de vigência. Catálogo e motor de regras locais são recursos distintos.

| Código | Referência oficial revisada | Modelo na referência |
|---|---|---|
| 215 | D01, schema da área de dados | 55/65 |
| 521 | I08-70, destino interno e contribuinte | 55 |
| 539 | 2B08-10, duplicidade com diferença de chave | 55/65 |
| 610 | W16-10, composição de vNF e exceções | 55/65 |
| 656 | Seção 4.3, consumo indevido por serviço | 55/65 |
| 694 | NA01-20, ICMSUFDest e exceções | 55 |
| 732 | I08-40, CFOP interestadual/idDest | 55 |
| 770 | I08-04, CFOP permitido na NF-e | 55/65 |

Fonte oficial: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf

Oobj: `https://oobj.com.br/bc/rejeicao-CODIGO-como-resolver/`, com URLs explícitas e verificadas em `catalog/rejections.json`. Não foram copiados artigos integrais ou exemplos de documentos reais. Não foi adotada orientação de trocar certificados/IPs para contornar consumo indevido, nem prazo universal de bloqueio. Rejeição 610 não ganhou fórmula universal, e 694 mantém a necessidade de examinar exceções e regime.

## Atualização funcional sem serviço pago

O catálogo é um arquivo editorial versionado, não um scraper. Para atualizar:

1. Consulte fontes oficiais e artigos originais permitidos. Escreva resumo próprio, condições, referências, modelos, relações e data de revisão em `catalog/rejections.json`; incremente `revision`.
2. Execute `npm run catalog:check`. A validação exige código único, fontes HTTPS sem credenciais, uma fonte oficial e Oobj, campos completos e relações válidas. Isso verifica estrutura, não a exatidão jurídica: revisão humana continua necessária.
3. Crie uma migration **nova** pelo CLI:

   ```bash
   npx supabase migration new rejection_catalog_revision
   npm run catalog:migration -- supabase/migrations/TIMESTAMP_rejection_catalog_revision.sql
   ```

   Use o caminho retornado pelo CLI. O gerador recusa sobrescrever um arquivo não vazio. Ele faz UPSERT por código, mantém IDs/favoritos, substitui fontes da entrada e usa transação. Entradas ausentes do arquivo não são apagadas silenciosamente; retirada de uma orientação exige migration explícita revisada.
4. Revise o SQL e execute testes em Supabase local. Atualize o teste de catálogo/migration para a revisão nova, preservando as migrations anteriores. Publique código e aplique só migrations pendentes no projeto correto.

Não há endpoint de edição global acessível a usuários comuns nem API externa gratuita presumida. Atualizações remotas exigem credencial administrativa de implantação, usada fora do navegador. Novos provedores externos dependem de API/contrato e condições de uso autorizadas.

## Busca, segurança e limites

`search_rejections` é uma função invoker; RLS exige sessão ativa. Usa parâmetros, busca textual portuguesa, título sem acentos e trigramas PostgreSQL (`pg_trgm`) com índice GIN. Metacaracteres de LIKE são escapados. Resultados aproximados são marcados. Catálogo/fontes são somente leitura para usuários; favoritos/histórico pertencem a `auth.uid()`.

Endpoints autenticados: `POST /api/rejections` pesquisa/registra; `GET /api/rejections` lista; `GET/PATCH /api/rejections/[code]` detalha/favorita; `GET/DELETE /api/rejections/history` lê/limpa histórico. POST/PATCH/DELETE exigem mesma origem. Até 60 pesquisas e alterações de favorito por minuto, 10 limpezas/minuto, mensagem até 500 caracteres e página até 10.000.

Mensagens ERP completas não são persistidas: o histórico recebe somente código reconhecido ou indicação sem identificação. Busca comum mascara padrões de CPF/CNPJ, identificadores longos e e-mail; isso não é anonimização completa de texto livre. Remova informações pessoais antes de pesquisar. Conteúdo é renderizado como texto React, nunca HTML externo. Não há transmissão da pesquisa às fontes externas.
