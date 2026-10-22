import { requireUser } from '@/lib/auth/session';
import { assertSameOrigin, failure, readBody, success } from '@/lib/api';
import { profileSchema } from '@/lib/auth/schemas';
import { rateLimit } from '@/services/rate-limit';

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, 'profile', 30, 60, user.id);
    const body = await readBody(request, profileSchema);
    const { data, error } = await supabase.from('profiles').update({ full_name: body.fullName }).eq('id', user.id).select('full_name').single();
    if (error) throw error;
    return success(data);
  } catch (error) { return failure(error); }
}
