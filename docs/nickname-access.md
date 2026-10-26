# Entrada por apelido

A pedido do proprietário, a interface passa a oferecer somente apelido. Não há
cadastro por e-mail, senha ou SMTP nesse fluxo. `/entrar` mostra o campo Apelido;
`/cadastro`, `/recuperar-senha` e `/nova-senha` redirecionam para essa entrada.

## Ativação

No projeto Supabase `kwgrlocfbkxbupydxmdu`, habilite **Allow anonymous sign-ins**
em Authentication → Sign In / Providers. No ambiente local, a opção
`auth.enable_anonymous_sign_ins = true` está versionada em `supabase/config.toml`.
Reinicie o Supabase local sem apagar volumes para aplicar a configuração.

## Segurança e persistência

- `POST /api/auth/anonymous` valida origem, apelido (3–100 caracteres) e limite de
  10 criações por hora por IP no aplicativo. Supabase também aplica seus limites.
- `signInAnonymously()` cria uma identidade real com UUID próprio e cookies SSR.
  O apelido é metadado de apresentação, nunca uma chave de acesso ou busca de conta.
- Requisições com sessão ativa reutilizam a identidade; visitar `/entrar` novamente
  redireciona ao painel. O proxy renova cookies nessa rota também.
- Dois navegadores com apelidos iguais continuam com UUIDs, arquivos e dados separados.
  RLS, verificação de sessão ativa e bucket privado permanecem habilitados.
- Não se usa chave administrativa para listar ou consultar documentos de visitantes.
- O acesso depende da sessão do navegador. Encerrar a sessão, apagar cookies ou
  mudar de aparelho não recupera o espaço. Há aviso na entrada/configurações e
  confirmação antes de sair. Nenhuma recuperação por apelido é implementada.
- A exclusão do espaço anônimo exige sessão ativa, mesma origem e `EXCLUIR`, sem
  senha. Limpa Storage antes de excluir Auth; a exclusão Auth remove as sessões e
  os registros relacionados. Se a limpeza falhar, a sessão permanece utilizável.
- Os endpoints de e-mail/senha permanecem como compatibilidade de contas anteriores,
  sem formulário público. Contas anteriores ainda exigem senha para exclusão.
  Não foi feito merge, conversão ou remoção de contas existentes.

## Operação

Usuários anônimos consomem cotas de Auth/banco e não são apagados automaticamente.
O operador deve acompanhar o volume no Supabase. Não há rotina automática para
remover espaços abandonados, evitando excluir documentos sem uma política definida.
Para abertura ampla ao público, avaliar proteção CAPTCHA/Turnstile conforme a
[documentação Supabase](https://supabase.com/docs/guides/auth/auth-anonymous).

## Testar

Execute `npm run check`, `npm run test:integration` e
`E2E_PRODUCTION=1 npm run test:e2e` com Supabase local. Os testes de integração
incluem identidades anônimas, isolamento, papel comum e tokens após exclusão.
O navegador verifica entrada sem senha, falha de conexão, persistência, documentos
privados entre apelidos iguais, preferências, confirmação de saída e exclusão real.
Os testes de módulos usam contas legadas pela API para preservar seus cenários e
fixtures; os testes da fundação exercitam a entrada anônima pela interface.
