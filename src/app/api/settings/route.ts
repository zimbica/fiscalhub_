import { requireUser } from '@/lib/auth/session';
import { assertSameOrigin, failure, readBody, success } from '@/lib/api';
import { settingsSchema } from '@/lib/auth/schemas';
import { rateLimit } from '@/services/rate-limit';

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, 'settings', 60, 60, user.id);
    const body = await readBody(request, settingsSchema);
    const { data, error } = await supabase.from('user_settings').update(body).eq('user_id', user.id).select('theme,accent').single();
    if (error) throw error;
    return success(data);
  } catch (error) { return failure(error); }
}
