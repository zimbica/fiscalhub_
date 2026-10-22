import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
import { safeRedirect } from '@/lib/auth/redirect';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeRedirect(url.searchParams.get('next')), appUrl()), { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  }
  return NextResponse.redirect(new URL('/entrar?erro=link', appUrl()), { headers: { 'Cache-Control': 'private, no-store' } });
}
