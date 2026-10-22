import { AuthForm } from '@/components/auth/auth-form';
import { serverConfigured } from '@/lib/env';
export const metadata = { title: 'Entrar' };
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const notice = params.erro === 'link' ? 'O link expirou ou foi aberto em outro navegador. Solicite um novo link e abra-o no navegador usado para iniciar o processo.' : params.senha === 'atualizada' ? 'Senha atualizada. Entre com sua nova senha.' : params.conta === 'excluida' ? 'Sua conta e seus dados foram excluídos.' : undefined;
  return <AuthForm mode="login" configured={serverConfigured()} notice={notice} />;
}
