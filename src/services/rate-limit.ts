import 'server-only';
import { createHmac } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api';

export async function rateLimit(request: Request, scope: string, limit: number, seconds: number, identity?: string) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) throw new ApiError(503, 'Configuração de segurança incompleta.', 'NOT_CONFIGURED');
  // Vercel overwrites x-vercel-forwarded-for. Other hosts use a shared conservative bucket.
  const ip = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'shared' : 'shared';
  const key = createHmac('sha256', secret).update(`${scope}:${identity || ip}`).digest('hex');
  const { data, error } = await createAdminClient().rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: seconds });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError(503, 'Não foi possível verificar o limite de solicitações. Tente novamente.');
  if (!data.allowed) throw new ApiError(429, 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 'RATE_LIMITED', Number(data.retryAfter));
}
