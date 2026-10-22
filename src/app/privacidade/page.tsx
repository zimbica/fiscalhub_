import Link from 'next/link';
import { Logo } from '@/components/logo';
export const metadata = { title: 'Privacidade e seus dados' };
export default function Privacy() {
  return <main className="mx-auto max-w-2xl px-6 py-12"><Logo /><h1 className="mt-12 text-3xl font-semibold tracking-tight">Privacidade e seus dados</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">O FiscalHub está em desenvolvimento. Esta página descreve os controles implementados nesta etapa; o responsável pela instalação deve complementar os dados do controlador e o canal de atendimento antes de abrir o serviço ao público.</p><div className="mt-8 space-y-7 text-sm leading-7">{[
    ['O que é armazenado', 'E-mail e credenciais são tratados exclusivamente pelo Supabase Auth. O aplicativo mantém seu nome, preferências de aparência e histórico de alterações do perfil. Não usa rastreadores de publicidade.'],
    ['Quem pode acessar', 'Cada conta acessa seus próprios registros por políticas de Row Level Security. Administradores da infraestrutura podem ter acesso operacional ao banco; a instalação deve restringir essas credenciais.'],
    ['Documentos fiscais', 'A estrutura de armazenamento usa um bucket privado com isolamento por usuário. A importação de documentos será disponibilizada em uma etapa posterior.'],
    ['Cookies e preferências', 'Cookies mantêm a sessão de autenticação. O navegador guarda a preferência de tema para aplicar a aparência durante o carregamento. Esses recursos são necessários para o funcionamento da aplicação.'],
    ['Exclusão e retenção', 'Em Configurações, você pode excluir a conta confirmando a senha e a palavra EXCLUIR. As sessões são revogadas e os registros associados são removidos. Backups do provedor seguem sua própria retenção e não são apagados individualmente por essa ação.'],
    ['Serviços externos', 'Supabase processa autenticação, banco e arquivos. Vercel pode hospedar a aplicação quando a implantação for configurada. O responsável pela instalação deve informar regiões, bases legais e procedimentos de atendimento aplicáveis.'],
  ].map(([title,text]) => <section key={title}><h2 className="font-semibold">{title}</h2><p className="mt-2 text-muted-foreground">{text}</p></section>)}</div><Link href="/" className="mt-10 inline-block text-sm font-medium text-primary hover:underline">← Voltar ao FiscalHub</Link></main>;
}
