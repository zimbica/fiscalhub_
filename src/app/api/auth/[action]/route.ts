import { createClient } from '@/lib/supabase/server';
import { ApiError, assertSameOrigin, failure, readBody, success } from '@/lib/api';
import { anonymousDeletionSchema, nicknameSchema, deletionSchema, loginSchema, passwordUpdateSchema, recoverySchema, signupSchema } from '@/lib/auth/schemas';
import { appUrl, serverConfigured } from '@/lib/env';
import { rateLimit } from '@/services/rate-limit';
import { requireUser } from '@/lib/auth/session';
import { deleteOwnAccount } from '@/services/account';
import type { AuthError } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authFailure(error: AuthError, fallback: string): never {
  if (error.status === 429) throw new ApiError(429, 'Limite de tentativas atingido. Aguarde alguns minutos.', 'RATE_LIMITED', 60);
  if (error.code === 'email_not_confirmed') throw new ApiError(403, 'Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.', 'EMAIL_NOT_CONFIRMED');
  throw new ApiError(400, fallback, 'AUTH_ERROR');
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    if (!serverConfigured()) throw new ApiError(503, 'Conecte o Supabase para usar a autenticação.', 'NOT_CONFIGURED');
    assertSameOrigin(request);
    const { action } = await context.params;
    if (!['anonymous','login','signup','recovery','password','logout','delete'].includes(action)) throw new ApiError(404, 'Ação não encontrada.');
    const supabase = await createClient();
    if (action === 'anonymous') {
      const body = await readBody(request, nicknameSchema);
      const { data: { user: current } } = await supabase.auth.getUser();
      if (current) {
        // A live session always wins; nicknames never select or recover an account.
        const { data: active, error: sessionError } = await supabase.rpc('has_active_session');
        if (sessionError) throw new ApiError(503, 'Não foi possível verificar seu acesso. Tente novamente.');
        if (active) return success({ redirect: '/painel' });
        await supabase.auth.signOut({ scope: 'local' });
      }
      await rateLimit(request, 'anonymous', 10, 3600);
      const { error } = await supabase.auth.signInAnonymously({ options: { data: { full_name: body.nickname } } });
      if (error?.code === 'anonymous_provider_disabled') throw new ApiError(503, 'A entrada por apelido ainda não foi ativada. Tente novamente mais tarde.', 'ANONYMOUS_DISABLED');
      if (error) authFailure(error, 'Não foi possível abrir seu espaço. Tente novamente em instantes.');
      return success({ redirect: '/painel' }, 201);
    }
    if (action === 'logout') {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error && error.status !== 403 && error.status !== 401) throw new ApiError(503, 'Não foi possível encerrar sua sessão. Tente novamente.');
      return success({ redirect: '/entrar' });
    }
    if (action === 'login') {
      await rateLimit(request, 'login', 20, 300);
      const body = await readBody(request, loginSchema);
      await rateLimit(request, 'login-email', 8, 300, body.email);
      const { error } = await supabase.auth.signInWithPassword(body);
      if (error) authFailure(error, 'E-mail ou senha incorretos.');
      return success({ redirect: '/painel' });
    }
    if (action === 'signup') {
      await rateLimit(request, 'signup', 5, 3600);
      const body = await readBody(request, signupSchema);
      const { data, error } = await supabase.auth.signUp({ email: body.email, password: body.password, options: {
        data: { full_name: body.fullName }, emailRedirectTo: `${appUrl()}/auth/callback`,
      } });
      if (error) authFailure(error, 'Não foi possível criar a conta. Verifique os dados ou tente recuperar sua senha.');
      if (data.session) return success({ redirect: '/painel' }, 201);
      return success({ message: 'Confira seu e-mail para continuar. Se você já tem uma conta, entre ou recupere sua senha.' }, 201);
    }
    if (action === 'recovery') {
      await rateLimit(request, 'recovery', 5, 3600);
      const body = await readBody(request, recoverySchema);
      const { error } = await supabase.auth.resetPasswordForEmail(body.email, { redirectTo: `${appUrl()}/auth/callback?next=/nova-senha` });
      if (error) authFailure(error, 'Não foi possível enviar a solicitação. Tente novamente em instantes.');
      return success({ message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha. Abra-o neste navegador.' });
    }
    const { user } = await requireUser();
    await rateLimit(request, action, 5, 300, user.id);
    if (action === 'password') {
      const body = await readBody(request, passwordUpdateSchema);
      const { error } = await supabase.auth.updateUser({ password: body.password });
      if (error) authFailure(error, 'Não foi possível atualizar a senha. Use uma senha diferente e tente novamente.');
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
      if (signOutError) throw new ApiError(503, 'Senha alterada, mas não foi possível encerrar todas as sessões. Tente sair novamente.');
      return success({ message: 'Senha atualizada. Entre com sua nova senha.', redirect: '/entrar?senha=atualizada' });
    }
    if (user.is_anonymous) {
      await readBody(request, anonymousDeletionSchema);
      await deleteOwnAccount();
    } else {
      const body = await readBody(request, deletionSchema);
      await deleteOwnAccount(body.password);
    }
    return success({ redirect: '/entrar?conta=excluida' });
  } catch (error) { return failure(error); }
}
