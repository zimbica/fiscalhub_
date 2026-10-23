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

O parser Saxes rejeita DOCTYPE/entidades externas, XML malformado, namespace incorreto, UTF-8 inválido e complexidade excessiva. ZIP é processado em worker com limites de entradas, proporção, tamanho declarado e bytes efetivamente expandidos; caminhos inseguros, criptografia e CRC inválido são recusados. Não há extração para diretórios do servidor. Os limites detalhados estão em [importação XML](xml-imports.md).

Originais são baixados como anexos por endpoint autenticado, nunca renderizados como HTML. CSV neutraliza prefixos de fórmula; XLSX grava dados como texto para preservar chaves e decimais. Storage e PostgreSQL não compartilham transação: uma falha de remoção interrompe a exclusão e permite retomar. Falha de compensação após upload pode deixar objeto privado órfão, removido na exclusão da conta; não há coletor automático de órfãos nesta etapa.

A etapa 4 acrescenta XSD real e regras locais condicionais. Verificação criptográfica de assinatura e regras fiscais completas permanecem pendentes. Importação e evidência de protocolo não comprovam autenticidade nem autorização online pela SEFAZ.

Antes de uso público, o controlador deve completar a página de privacidade, contato, base legal, retenção, política de backups, resposta a incidentes e atendimento LGPD. Esses procedimentos organizacionais não são substituídos por código.

## Segredos

Nunca versionar `.env.local`, tokens, XMLs reais, exportações ou capturas com dados de clientes. `.env.example` contém apenas nomes. Não colocar `SUPABASE_SECRET_KEY` ou `RATE_LIMIT_SECRET` em variáveis `NEXT_PUBLIC_*`. Os testes só aceitam endpoints locais e criam/removem contas sintéticas.

## Validador da etapa 4

DTD/XXE rejeitados antes do libxml2; schemas locais fixados com hashes, sem resolução de URLs fornecidas pelo XML. WASM com memória/prazo limitados e worker encerrado ao concluir/falhar. Cópias privadas e relatórios têm RLS, FK de proprietário e exclusão própria. Arquivos nunca são corrigidos automaticamente; edição explícita ocorre em cópia. Consulte [limites](xml-validation.md). Validação XSD da estrutura de assinatura não equivale à verificação criptográfica.

## Rejeições da etapa 5

Catálogo e fontes têm apenas SELECT para usuários autenticados com sessão ativa; favoritos/histórico usam RLS do proprietário. A busca executa com privilégios do chamador e parâmetros SQL, sem acesso administrativo. Mensagem completa do ERP não é gravada; veja limites da minimização de texto livre em [catálogo](rejections.md). URLs externas são referências editoriais HTTPS; entradas do usuário não controlam requisições externas. Resumos e exemplos são renderizados como texto, sem HTML injetado.
