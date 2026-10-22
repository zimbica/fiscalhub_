import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

export function createAdminClient() {
  const env = publicEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!env || !secret) throw new Error('Configuração administrativa ausente.');
  return createClient<Database>(env.url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
