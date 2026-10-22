import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

export async function createClient() {
  const env = publicEnv();
  if (!env) throw new Error('Supabase não configurado.');
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && !env.url.startsWith('http://') }));
        } catch {
          // Server Components cannot set cookies. src/proxy.ts refreshes them.
        }
      },
    },
  });
}
