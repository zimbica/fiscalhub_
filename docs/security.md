# Segurança e tratamento de dados

## Controles implementados

- Credenciais só no Supabase Auth. Segredo administrativo importado exclusivamente em módulos `server-only`.
- `getUser` + verificação da sessão antes dos endpoints privados. RLS também nega acesso direto usando JWT de sessão revogada.
- Tabelas privadas sem acesso anônimo; grants por operação/coluna. Catálogo global é somente leitura para contas autenticadas.
- Todas as tabelas `public` têm RLS; tabelas privadas também. Não há view que contorne RLS.
- Funções `SECURITY DEFINER` ficam em `private`, com `search_path=''` e permissões explícitas. Triggers de cadastro têm privilégio elevado estritamente para criar perfil/preferências; não são APIs executáveis pelo usuário.
- Consultas parametrizadas via PostgREST. Zod no servidor e no formulário; HTML de usuário é escapado pelo React.
- Origem validada em mutações, cookies SameSite, callback com destinos permitidos e respostas privadas sem cache.
- Limitador atômico e persistente no PostgreSQL, acessível somente com chave administrativa. Login limitado também por e-mail. IP/e-mail viram HMAC e expiram; limpeza de entradas antigas ocorre em chamadas seguintes.
- Em Vercel, apenas o cabeçalho de IP sobrescrito pela plataforma é utilizado. Outros hosts usam um limite compartilhado conservador. Adapte isso conscientemente antes de hospedar atrás de outro proxy.
- Exclusão exige senha atual, confirmação `EXCLUIR` e limite de tentativas. Revoga todas as sessões, remove objetos pelo Storage API, então remove `auth.users` e os dados associados por cascata.
- Bucket privado, acesso por prefixo UUID, MIME XML, tamanho máximo 5 MiB, sem sobrescrita de originais.
- Headers `nosniff`, bloqueio de iframe, restrição de permissões de navegador e referrer policy. Não são uma certificação de segurança.

## Limites e operação

Storage e Auth não participam de uma única transação. A exclusão pode falhar parcialmente após revogar sessões/remover alguns objetos. A interface informa falha e permite nova tentativa após login. Backups têm retenção do provedor; exclusão da conta não remove imediatamente cópias de backup.

Perfis administrativos são uma estrutura futura. A instalação não deve abrir funcionalidades administrativas sem autorização explícita server-side. Não promover usuários com `user_metadata`.

Configure JWT de curta duração (o ambiente local usa 15 minutos), confirmação de e-mail, URLs exatas de redirecionamento e SMTP adequado para usuários reais. Avalie CAPTCHA nativo do Supabase conforme exposição; nenhum CAPTCHA é contornado.

Ainda serão implementados os controles de parsing XML, XXE, entidades, ZIP bombs, assinatura, regras fiscais e limites de lote nas etapas 3 e 4. A existência do bucket não significa que um XML nele seja válido.

Antes de uso público, o controlador deve completar a página de privacidade, contato, base legal, retenção, política de backups, resposta a incidentes e atendimento LGPD. Esses procedimentos organizacionais não são substituídos por código.

## Segredos

Nunca versionar `.env.local`, tokens, XMLs reais, exportações ou capturas com dados de clientes. `.env.example` contém apenas nomes. Não colocar `SUPABASE_SECRET_KEY` ou `RATE_LIMIT_SECRET` em variáveis `NEXT_PUBLIC_*`. Os testes só aceitam endpoints locais e criam/removem contas sintéticas.
