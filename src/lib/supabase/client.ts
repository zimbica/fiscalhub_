'use client';
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

export function createClient() {
  const env = publicEnv();
  if (!env) throw new Error('Supabase não configurado.');
  return createBrowserClient<Database>(env.url, env.key);
}
