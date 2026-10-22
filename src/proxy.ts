import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';

export async function proxy(request: NextRequest) {
  const env = publicEnv();
  let response = NextResponse.next({ request });
  if (!env) return response;
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  // Verifies signature and refreshes tokens. Authorization is repeated at the data boundary.
  await supabase.auth.getClaims();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/painel/:path*', '/configuracoes/:path*', '/historico/:path*', '/projeto/:path*', '/nova-senha', '/api/:path*'] };
