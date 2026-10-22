import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/api';
import { serverConfigured } from '@/lib/env';

export async function requireUser() {
  if (!serverConfigured()) throw new ApiError(503, 'Conecte o Supabase para continuar.', 'NOT_CONFIGURED');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new ApiError(401, 'Entre na sua conta para continuar.', 'UNAUTHENTICATED');
  const { data: active, error: sessionError } = await supabase.rpc('has_active_session');
  if (sessionError) throw new ApiError(503, 'Não foi possível verificar sua sessão. Tente novamente.');
  if (!active) throw new ApiError(401, 'Sua sessão expirou. Entre novamente.', 'UNAUTHENTICATED');
  return { supabase, user };
}

export const requirePageUser = cache(async () => {
  if (!serverConfigured()) redirect('/instalacao');
  try { return await requireUser(); }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/entrar');
    throw error;
  }
});
