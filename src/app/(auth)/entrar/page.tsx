import { NicknameForm } from '@/components/auth/nickname-form';
import { serverConfigured } from '@/lib/env';
import { requirePageUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export const metadata = { title: 'Começar' };
export const dynamic = 'force-dynamic';
export default async function Entry({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (serverConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: active, error } = await supabase.rpc('has_active_session');
      if (error) await requirePageUser();
      if (active) redirect('/painel');
    }
  }
  const params = await searchParams;
  return <NicknameForm configured={serverConfigured()} notice={params.conta === 'excluida' ? 'Seu espaço e seus dados foram excluídos.' : undefined} />;
}
