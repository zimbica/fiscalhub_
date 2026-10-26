# Consulta de CNPJ e Inscrição Estadual — Etapa 2

## Fonte padrão e limites

O backend consulta `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}` sob demanda, após autenticação. Não há varredura de cadastros nem busca externa em lote. O código público da BrasilAPI utiliza o projeto Minha Receita, alimentado por dados abertos da Receita Federal. É uma fonte intermediária, **não uma consulta autenticada em tempo real à Receita**. A data de obtenção é exibida; a atualização da base fica como não informada quando a fonte não a fornece.

Referências consultadas em 22/10/2026:

- [BrasilAPI — documentação](https://brasilapi.com.br/docs#tag/CNPJ).
- [Implementação oficial do endpoint](https://github.com/BrasilAPI/BrasilAPI/blob/main/pages/api/cnpj/v1/%5Bcnpj%5D.js).
- [Provedor usado pela BrasilAPI](https://github.com/BrasilAPI/BrasilAPI/blob/main/services/cnpj.js).
- [Condições de uso](https://brasilapi.com.br/): não realizar consultas em massa/varreduras.
- [Receita Federal — manual de cálculo dos dígitos do CNPJ](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf).
- [CCC/SVRS](https://dfe-portal.svrs.rs.gov.br/Nfe/Ccc): acesso manual, sujeito a autenticação gov.br.
- [Cadastro SEFAZ-RS](https://www.sefaz.rs.gov.br/consultas/contribuinte): consulta manual oficial.

Os dígitos verificadores são calculados com módulo 11, pesos 2–9 da direita para a esquerda e valor ASCII menos 48. O exemplo oficial `12.ABC.345/01DE-35` está coberto por teste. A validação local do identificador não garante que o cadastro esteja disponível no provedor. HTTP 400/404/503 são tratados sem inventar informações.

Não são armazenados QSA, nomes ou CPFs de sócios. Razão social, nome fantasia, situação, datas, CNAEs, natureza jurídica, opções Simples/MEI, endereço e contatos têm referência à fonte. Regimes tributários retornados com ano são exibidos como **histórico**; não estar no Simples não permite deduzir Lucro Real ou Presumido atual.

## Cache, histórico e segurança

- Cache por usuário/CNPJ por 24 horas; nenhuma conta lê o cache de outra.
- Nova consulta válida usa o cache e acrescenta histórico. O botão Atualizar força a fonte.
- Em indisponibilidade de transporte, pode mostrar consulta anterior com aviso explícito. HTTP 404 não faz fallback silencioso.
- `save_company_query` salva empresa, IEs e histórico em uma transação PostgreSQL. O refresh preserva o favorito e substitui as inscrições anteriores.
- Limites persistentes por usuário: 10 consultas/minuto, 120/dia e 5 atualizações/minuto. Consultas de cache também contam. São limites do aplicativo, não garantias da cota externa.
- Timeout de 10 segundos por fonte, resposta de até 1 MiB, sem seguir redirecionamentos. A BrasilAPI recebe identificação `FiscalHub` no User-Agent e `Accept: application/json`.
- Fontes exibidas só aceitam HTTP/HTTPS. Mutação exige mesma origem, sessão ativa, validação server-side e RLS.
- O histórico agrupa empresas e oferece pesquisa, paginação, favoritos e exclusão com confirmação. As ocorrências individuais também ficam em `cnpj_queries`; o histórico geral registra a ação.
- Exclusão de empresa remove cache, inscrições e consultas associadas. O evento genérico de atividade permanece, sem nome ou CNPJ. Exclusão da conta remove os dados privados.

## IE: o que funciona sem contratar um serviço

A BrasilAPI não retornou inscrições estaduais no contrato consultado. A integração padrão apresenta **IE não verificada**, independentemente da situação do CNPJ, e links oficiais. O CCC pode atender consultas de várias UFs, mas exige as credenciais apropriadas. Para RS também existe link direto ao cadastro estadual. Nenhum CAPTCHA, login ou certificado é contornado; o sistema não automatiza scraping dessas telas.

O adaptador opcional aceita um gateway autorizado, a ser configurado pelo responsável. Não há serviço pago nem fornecedor contratado incluído. Para ativar, definir no servidor:

```dotenv
IE_PROVIDER_URL=
IE_PROVIDER_TOKEN=
```

O gateway deve aceitar `GET` HTTPS, parâmetros `cnpj` e `uf` (quando conhecida) e `Authorization: Bearer <token>`. `uf` é contexto da sede, não deve limitar outras inscrições que a fonte legitimamente ofereça. O resultado tem o contrato de `src/types/company.ts`:

```ts
type Source = { name: string; url: string; retrievedAt: string }; // ISO UTC
type Result = {
  outcome: 'verified' | 'not_found' | 'unavailable';
  message: string;
  source: Source | null;
  registrations: Array<{
    uf: string;
    registration: string;
    status: 'active' | 'suspended' | 'closed' | 'unfit' | 'unknown';
    verified: boolean;
    source: Source;
  }>;
};
```

`verified` exige fonte geral e pelo menos uma inscrição com evidência. `not_found` exige fonte e lista vazia, significando ausência no escopo daquela consulta. `unavailable` nunca confirma inscrições. Resposta sem evidência, erro ou timeout retorna não verificada. Os testes usam um gateway simulado apenas para exercitar esse contrato; **nenhuma integração estadual automática foi homologada em produção**.

Para novos provedores, implemente `CompanyProvider`/`StateRegistrationProvider` e selecione no factory `services/providers/index.ts`. Consulte condições de uso e disponibilidade antes de habilitar. A data de revisão destas referências deve ser atualizada com mudanças do provedor.

## Ativação e teste

1. Aplique a migration de fundação e depois `20261022174422_company_queries.sql` e `20261022180528_company_query_index.sql`. No projeto remoto indicado pelo proprietário, as três já foram aplicadas nesta entrega.
2. Configure as cinco variáveis obrigatórias de autenticação/servidor conforme `deployment.md`. CNPJ não precisa de chave adicional.
3. Inicie o aplicativo, crie conta e abra `/consulta-cnpj`. Consulte um identificador conhecido, confira origem/data, atualize, favorite, pesquise e exclua.
4. Para teste automatizado externo contra **Supabase local**, execute `REAL_CNPJ_TEST=1 npm run test:e2e -- tests/e2e/companies.spec.ts`. Esse teste consulta ao vivo o CNPJ público do Banco do Brasil e remove sua conta de teste. Não entra no CI padrão para não tornar os checks dependentes da disponibilidade externa.

Em redes que exigem proxy, o Node.js 24 pode precisar de `NODE_USE_ENV_PROXY=1`, com as variáveis de proxy/CA fornecidas pelo ambiente e `NO_PROXY` para localhost. Não desative TLS nem copie credenciais do proxy para o projeto. Isso não é necessário na implantação padrão da Vercel.

## Integração CNPJá sem certificado — 26/10/2026

Foi adicionado um conector real para `GET https://api.cnpja.com/ccc`, usando
`taxId=<CNPJ>&states=ALL&source=CCC&strategy=CACHE_IF_FRESH&maxAge=1`.
O CNPJ continua sendo obtido pela BrasilAPI; a chamada adicional consulta somente IE.
O FiscalHub não solicita certificado digital nem acesso gov.br. O responsável precisa
criar uma conta **gratuita** no CNPJá e configurar `CNPJA_API_KEY` no servidor.

### Gratuidade e ativação

- A página de preços consultada anuncia **50 créditos gratuitos mensais**. O guia
  informa 1 crédito por consulta online ao CCC, independentemente das UFs, e cache
  sem consumo. Essa cota é compartilhada pela conta do fornecedor, não por visitante
  do FiscalHub. Termos/cotas podem mudar: verificar antes de ativar.
- Usar exclusivamente o plano gratuito, sem contratar assinatura ou comprar créditos.
  Não existem chamadas de contratação, recarga ou pagamento no conector.
- Criar conta em https://cnpja.com/pricing e obter chave em https://cnpja.com/me/api-key.
  Na Vercel, cadastrar `CNPJA_API_KEY` como variável sensível em Production, sem
  prefixo `NEXT_PUBLIC_`, e fazer novo deploy. Não enviar a chave no chat ou Git.
- `IE_PROVIDER_URL` + `IE_PROVIDER_TOKEN`, se configurados, têm precedência para
  preservar um gateway existente. Sem gateway ou chave, permanece a orientação manual.
- Após ativar, usar **Atualizar** em empresas já consultadas: o cache privado pode
  conter uma resposta anterior sem IE por até 24 horas.
- HTTP 429/402 interrompe a consulta com aviso de cota; não há repetição automática,
  troca para provedor pago ou ampliação automática de plano. O CNPJ segue disponível.

### Evidência e cobertura

`ALL` solicita todas as UFs ao CCC. Isso é cobertura documentada pelo fornecedor,
não teste individual das 27 UFs nem garantia de disponibilidade estadual.
O fornecedor intermediário é identificado na tela; não se apresenta como API direta
do governo. Retornos incluem origem, data da consulta e data de atualização da fonte.

O contrato foi conferido no guia e nos tipos publicados do SDK oficial `@cnpja/sdk`
1.9.1 (não instalado como dependência). A chave vai somente no cabeçalho Authorization,
sem Bearer, para domínio fixo; timeout de 10 segundos, limite de 1 MiB e redirecionamentos
bloqueados. Não se persiste nome de produtor rural, QSA nem campos desnecessários.

`enabled` indica habilitação; `status.id` descreve restrições como destinatário.
Bloqueio não é traduzido em baixa, suspensão ou inaptidão. A descrição recebida é
preservada. Dados com mais de 24h ou `stale=true` são exibidos como históricos, sem
confirmar situação atual. CNPJ divergente, UF inválida, data futura, resposta incompleta,
HTML, timeout e 404 nunca são classificados como ausência de IE. Lista vazia válida
indica ausência apenas no escopo da fonte. Não há fallback silencioso para dados antigos.

### Referências e verificação

- Guia e contrato: https://cnpja.com/api e https://cnpja.com/api/reference
- Cota gratuita: https://cnpja.com/pricing
- SDK oficial: https://www.npmjs.com/package/@cnpja/sdk
- FiscalAPI não selecionada: https://fiscalapi.com.br/precos/ informa gratuidade no
  painel, mas exige plano para a API por chave.

A integração externa não pode ser homologada sem a chave. Os testes de contrato
usam respostas sintéticas claramente identificadas; não comprovam uma consulta real
nem disponibilidade do fornecedor. Nenhuma credencial foi criada ou contratada.
