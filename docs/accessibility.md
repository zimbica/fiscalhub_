# Acessibilidade

A revisão automatizada usa `@axe-core/playwright` 4.14.0, somente como dependência
de desenvolvimento. O pacote não é enviado ao navegador da aplicação.

```bash
npm run build
E2E_PRODUCTION=1 npm run test:e2e -- tests/e2e/accessibility.spec.ts
```

Exige Supabase local e `.env.local`, como os demais E2E. Cria uma conta sintética
temporária e a remove ao terminar. Não escreve no Supabase hospedado.

## Cobertura

- Login, cadastro e recuperação de senha.
- Painel vazio nas quatro combinações de tema claro/escuro e azul/roxo.
- Páginas de documentos, validador, rejeições, configurações, histórico e CNPJ
  no estado inicial, sem documentos privados reais.
- Menu lateral móvel aberto a 390 px; Escape devolve foco ao botão de abertura.
- Tab e Enter no link “Ir para o conteúdo” transferem o foco para o conteúdo.
- Regras automáticas axe com tags WCAG 2 A/AA, 2.1 A/AA e 2.2 AA, sem exclusões.

O teste espera o término das transições e usa preferência por movimento reduzido
para medir cores estáveis. A troca das quatro paletas é feita no DOM para testar
os tokens de cor; persistência de preferências continua coberta pelo teste da
fundação com salvamento real pelo formulário.

## Decisões de interface

`primary` permanece a cor de fundo dos controles. `primary-text` define uma cor
separada para links, ícones e textos de destaque: mais escura no tema claro e mais
clara no escuro. Isso evita usar a mesma cor em texto sobre fundo suave e em botão
com texto branco. Textos secundários e controles destrutivos também têm contraste
reforçado. Rótulos do cabeçalho usam o conteúdo textual do controle, incluindo o
atalho visível da busca. O conteúdo principal aceita foco programático sem criar
uma parada extra na sequência normal de Tab.

## Limites

Uma varredura automática não certifica conformidade WCAG. Ainda é necessária
revisão manual com leitores de tela, zoom e estados de resultados preenchidos,
gráficos e relatórios. A cobertura acima não representa todos os estados possíveis
da aplicação nem substitui testes de usabilidade com pessoas com deficiência.
