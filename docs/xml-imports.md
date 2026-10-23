# Importação e análise de documentos — Etapa 3

## Utilização

Em **Documentos**, informe um nome para o lote, selecione ou arraste XMLs/ZIPs e clique em **Iniciar importação**. O navegador descompacta um arquivo por vez e o servidor extrai e persiste seus dados. Mantenha a página aberta. **Pausar** conclui a requisição em andamento; **Retomar** permite selecionar novamente os mesmos arquivos. Recibos já gravados são reconhecidos por lote, SHA-256 e nome, sem incrementar contagens novamente.

O histórico mostra arquivos importados, atualizados, duplicados, conflitantes e inválidos. XML malformado recebe uma explicação; não cria nota vazia. Originais aceitos são preservados byte a byte em bucket privado. ZIPs e XMLs inválidos não são armazenados.

Filtros atualizam a tabela, os indicadores e todos os gráficos. Filtros de item (NCM, CFOP, produto, CST/CSOSN) selecionam documentos que contenham um item correspondente; os totais e gráficos incluem todos os itens desses documentos, sem recalcular uma nota parcial. Datas são agrupadas no fuso `America/Sao_Paulo`; escolher autorização exclui documentos sem data de autorização identificada. Por padrão, os valores incluem os documentos selecionados, inclusive homologação, cancelamentos, entradas e devoluções. Use os filtros para definir o recorte; a soma não equivale automaticamente a faturamento ou imposto devido.

## Formatos e dados

- NF-e/NFC-e 4.00, modelos 55 e 65: raízes `NFe` e `nfeProc`, namespace oficial, UTF-8.
- Eventos individuais: `evento`, `retEvento`, `procEventoNFe`. Pedido e retorno devem concordar em chave, ambiente, tipo e sequência.
- Identificação, emitente/destinatário, produtos, CFOP/NCM/CST/CSOSN, pagamentos, troco e grupos tributários são extraídos. Grupos adicionais são preservados em JSONB e no original.
- IBS/CBS: preservação dos grupos presentes e extração de `vIBS`/`vCBS` únicos em `IBSCBSTot`. Não há inferência de alíquota, obrigação ou vigência tributária nesta etapa.
- Decimais são processados com `decimal.js` e armazenados como PostgreSQL `numeric`. APIs retornam valores como texto; somente coordenadas visuais dos gráficos usam números JavaScript.
- Quantidades são apresentadas por unidade comercial, evitando somar quilogramas e unidades como se fossem a mesma medida. Tributos destacados somam ICMS, ST, IPI, PIS, COFINS, FCP, FCP-ST, IBS e CBS extraídos; não incluem estimativa `vTotTrib`.

## Evidências e duplicidade

Unicidade da nota: **usuário + chave de acesso + ambiente**. Um hash do conteúdo normalizado de `infNFe` diferencia cópias de conflitos; ele não é canonicalização de assinatura XML. Prefixos e espaços de formatação não criam novas notas. Mesmo conteúdo com protocolo posterior pode acrescentar autorização; conteúdo diferente na mesma chave gera conflito e preserva a nota anterior.

Autorização identificada exige protocolo para a mesma chave/ambiente, número, data e retorno 100/150. Retornos de denegação previstos são separados. Sem evidência suficiente, a situação é **não confirmada**. Não há consulta online nem verificação da assinatura/autenticidade do protocolo.

Cancelamento exige evento vinculado aceito (retorno 135/155, protocolo e data), do tipo 110111; o tipo 110112 é aplicado somente à NFC-e conforme NT 2018.004. Pedido sem retorno ou retorno 136 não cancela a nota. Evento pode ser importado antes da nota. Finalidade de devolução é independente de cancelamento.

Cada cópia conserva seu recibo e original para rastrear a fonte. Excluir um lote remove somente suas fontes; situação e autorização são recalculadas com as evidências restantes. Excluir documento remove seus recibos e os eventos identificados da mesma chave/ambiente. A confirmação informa o efeito. Remoção ocorre em blocos de 50; se falhar, repita para concluir. Storage e banco não oferecem uma transação conjunta.

## Verificações de extração

As verificações abaixo identificam problemas e alertas; não substituem o futuro validador fiscal:

| Código local | Verificação e alcance |
|---|---|
| `KEY_DV`, `KEY_MODEL` | Dígito da chave e modelo compatível com `mod`; inconsistência estrutural |
| `PRODUCT_SUM` | `ICMSTot/vProd` comparado à soma de itens sujeitos ao ICMS com `indTot=1`; tolerância de R$ 0,01; exige classificação ICMS/ISSQN dos itens |
| `DISCOUNT_SUM` | Diferença entre descontos dos itens e total; alerta para revisão das condições da operação |
| `TOTAL_REVIEW` | Composição aritmética básica de `vNF`; somente finalidade normal, todos os itens incluídos, sem total ISSQN/IBS-CBS ou desoneração; sempre alerta, sem código de rejeição atribuído |
| `DIFFERENT_TIMESTAMPS` | Emissão e autorização diferentes; informação para análise, não erro comprovado |
| `PROTOCOL_*`, `MISSING_ITEM_FIELD`, `UNCLASSIFIED_ITEM_TAX`, `AMBIGUOUS_TAX` | Evidência incompleta, campos ausentes ou extração sem base suficiente |

Referências: [MOC 7, Anexo I — leiaute e regras](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf), especialmente composição de chave e W07/W10; [NT 2018.004 — cancelamento por substituição](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=DEisbx2XCIs%3D). Esta etapa não implementa todo o MOC nem garante vigência de uma rejeição em cada UF. Alterações futuras devem versionar regras e schemas na etapa 4.

## Limites operacionais

| Recurso | Limite atual |
|---|---|
| XML individual | 2 MiB, UTF-8, profundidade 64, 100 mil elementos, 32 atributos por elemento |
| Documento | Até 990 itens e 100 pagamentos |
| ZIP | 32 MiB, sem senha, caminhos seguros e CRC verificado |
| Seleção expandida | 128 MiB, 10 mil entradas, proporção de expansão até 200 |
| Upload | Um XML por chamada; intervalo mínimo de 125 ms; 600 arquivos/minuto e 10 mil/dia por usuário |
| Criação de lotes | 30/hora por usuário |
| Tabela e histórico | 25 documentos/arquivos por página; 10 lotes por página |
| Gráficos | Últimos 180 dias/36 meses disponíveis no recorte; rankings de 10 posições |
| Exportação | Até 5.000 documentos filtrados por arquivo, 10 exportações/minuto |

Arquivos não XML dentro do ZIP são ignorados e contabilizados. ZIPs aninhados, envelopes com vários eventos, XML UTF-16, leiautes antigos e outros modelos não são suportados nesta etapa. Arquivos podem ser rejeitados preventivamente quando atingem limites de segurança, mesmo que um outro sistema consiga abri-los. Os limites gratuitos de infraestrutura continuam aplicáveis e podem ser menores em volume acumulado.

CSV usa UTF-8 com BOM e ponto e vírgula; prefixos de fórmula são neutralizados. Ao abrir no Excel, importe chave/CNPJ como **texto** para preservar zeros e 44 dígitos. XLSX já exporta células como texto, inclusive decimais, preservando precisão; converta explicitamente se quiser realizar cálculos na planilha. PDF e comparação de XMLs ficam para etapas posteriores.

## O que ainda falta

Editor XML, XSD real com pacotes oficiais versionados, assinatura digital, regras fiscais por UF/vigência e relatório completo de validação pertencem à etapa 4. A extração desta etapa não executa essas verificações e não declara XML fiscalmente válido. Catálogo pesquisável de rejeições/Oobj pertence à etapa 5. Nenhum XML original é corrigido automaticamente.
