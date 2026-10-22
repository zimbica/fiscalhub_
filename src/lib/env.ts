export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL não configurada.');
  }
  return new URL(value || 'http://localhost:3000').origin;
}

export function serverConfigured() {
  return Boolean(publicEnv() && process.env.SUPABASE_SECRET_KEY && process.env.RATE_LIMIT_SECRET && process.env.NEXT_PUBLIC_APP_URL);
}
