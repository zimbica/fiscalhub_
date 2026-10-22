import 'server-only';
import { createClient as createIsolatedClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { publicEnv } from '@/lib/env';
import { requireUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/api';

async function removeUserFiles(userId: string) {
  const bucket = createAdminClient().storage.from('fiscal-xml');
  async function removeFolder(folder: string, depth = 0) {
    if (depth > 10) throw new ApiError(409, 'Há arquivos que precisam de revisão antes da exclusão.');
    // Always remove page 0: successful deletions move remaining objects to page 0.
    for (;;) {
      const { data, error } = await bucket.list(folder, { limit: 100, offset: 0 });
      if (error) throw new ApiError(503, 'Não foi possível remover seus arquivos. Sua conta foi preservada.');
      if (!data?.length) return;
      const files = data.filter((item) => item.id).map((item) => `${folder}/${item.name}`);
      for (const item of data.filter((item) => !item.id)) await removeFolder(`${folder}/${item.name}`, depth + 1);
      if (files.length) {
        const { error: removeError } = await bucket.remove(files);
        if (removeError) throw new ApiError(503, 'Não foi possível remover todos os arquivos. Tente novamente.');
      }
    }
  }
  await removeFolder(userId);
}

export async function deleteOwnAccount(password: string) {
  const { user, supabase } = await requireUser();
  if (!user.email) throw new ApiError(400, 'Conta sem e-mail de autenticação.');
  const env = publicEnv()!;
  const verifier = createIsolatedClient(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await verifier.auth.signInWithPassword({ email: user.email, password });
  if (error || data.user?.id !== user.id || !data.session) throw new ApiError(403, 'Senha incorreta. Sua conta foi preservada.');
  const admin = createAdminClient();
  // Revoke all sessions before deleting data. RLS also checks auth.sessions for old JWTs.
  const { error: revokeError } = await admin.auth.admin.signOut(data.session.access_token, 'global');
  if (revokeError) throw new ApiError(503, 'Não foi possível encerrar suas sessões. Tente novamente.');
  await removeUserFiles(user.id);
  const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
  if (deletionError) throw new ApiError(503, 'A exclusão não foi concluída. Entre novamente para tentar de novo.');
  await supabase.auth.signOut({ scope: 'local' });
}
