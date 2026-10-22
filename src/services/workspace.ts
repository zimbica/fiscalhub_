import 'server-only';
import { z } from 'zod';
import { requirePageUser } from '@/lib/auth/session';
import { settingsSchema } from '@/lib/auth/schemas';
export const activityNames: Record<string, string> = { account_created: 'Conta criada', profile_updated: 'Perfil atualizado', preferences_updated: 'Preferências atualizadas', cnpj_queried: 'Consulta de CNPJ registrada' };

export async function getWorkspace() {
  const { supabase, user } = await requirePageUser();
  const [profile, settings] = await Promise.all([
    supabase.from('profiles').select('full_name, role, created_at').eq('id',user.id).single(),
    supabase.from('user_settings').select('theme,accent').eq('user_id',user.id).single(),
  ]);
  if (profile.error || settings.error) throw new Error('Não foi possível carregar seu perfil. Verifique as migrations e a conexão.');
  return { user, profile: profile.data, preferences: settingsSchema.parse(settings.data) };
}
export async function getDashboard() {
  const { supabase } = await requirePageUser();
  const [summary, events] = await Promise.all([
    supabase.rpc('dashboard_summary'),
    supabase.from('activity_events').select('id,action,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(4),
  ]);
  if (summary.error || events.error) throw new Error('Não foi possível carregar os indicadores.');
  const schema = z.object({ documents: z.number().int(), totalValue: z.string(), validations: z.number().int(), companies: z.number().int() });
  return { summary: schema.parse(summary.data), events: events.data };
}
