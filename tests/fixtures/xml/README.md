# XMLs sintéticos — testes da importação

Nenhum destes arquivos é assinado ou possui autorização real. Os protocolos, empresas, destinatários e produtos são apenas fixtures. **Não representam arquivos aprovados em XSD**: a homologação dos schemas pertence à etapa 4.

| Arquivo | Resultado esperado na importação |
|---|---|
| nfe-55.xml | NF-e, total decimal 0,30, dois itens e evidência de autorização simulada no arquivo |
| nfce-65.xml | NFC-e com chave própria, dois itens e pagamento |
| nfe-sem-protocolo.xml | Mesma NF-e sem confirmação; protocolo posterior pode atualizar a evidência |
| devolucao.xml | Finalidade 4; nunca inferir cancelamento |
| cancelamento.xml | Evento 110111 com retorno 135; identifica cancelamento da chave correspondente |
| pedido-cancelamento.xml | Pedido sem retorno; não confirma cancelamento |
| evento-nao-vinculado.xml | Retorno 136; não identifica cancelamento vinculado |
| reforma-tributaria.xml | Preserva grupos IBS/CBS, extrai totais distintos; não verifica regras da reforma |
| total-divergente.xml | Alerta aritmético em vNF; não representa rejeição universal |
| malformado.xml | Recusado pelo parser XML real |

`tests/fixtures/fiscal-fixtures.ts` gera variações adicionais para testar namespaces, referências incompatíveis, duplicidade, precisão e entradas maliciosas. Arquivos nunca são carregados como dados de demonstração da aplicação.
