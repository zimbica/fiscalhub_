import { Buffer } from 'node:buffer';
import { pathToFileURL } from 'node:url';

function role(value) {
  try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role; }
  catch { return undefined; }
}

// Offline configuration checks only: never authenticate, send credentials or print values.
export function deploymentIssues(env) {
  const issues = [];
  const required = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'RATE_LIMIT_SECRET'];
  for (const name of required) {
    if (!env[name]?.trim()) issues.push(`${name}: variável obrigatória ausente.`);
  }
  for (const name of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'IE_PROVIDER_URL']) {
    if (!env[name]) continue;
    try {
      const url = new URL(env[name]);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
          /^(localhost|127\.|\[?::1\]?)/i.test(url.hostname) ||
          (name !== 'IE_PROVIDER_URL' && url.pathname !== '/')) throw new Error();
    } catch { issues.push(`${name}: use URL HTTPS pública, sem credenciais, consulta ou fragmento; URLs da aplicação e Supabase devem conter somente a origem.`); }
  }
  const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  if (publicKey && !publicKey.startsWith('sb_publishable_') && role(publicKey) !== 'anon') {
    issues.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: formato publicável não reconhecido.');
  }
  const secret = env.SUPABASE_SECRET_KEY || '';
  if (secret && !secret.startsWith('sb_secret_') && role(secret) !== 'service_role') {
    issues.push('SUPABASE_SECRET_KEY: formato de chave do servidor não reconhecido.');
  }
  const rateSecret = env.RATE_LIMIT_SECRET || '';
  if (rateSecret && (Buffer.byteLength(rateSecret) < 32 || new Set(rateSecret).size < 8)) {
    issues.push('RATE_LIMIT_SECRET: gere um segredo aleatório de pelo menos 32 bytes; valores curtos ou repetitivos foram recusados.');
  }
  // Use fixed messages: even a malicious variable name/value must not leak credentials.
  if (Object.entries(env).some(([name, value]) => name.startsWith('NEXT_PUBLIC_') && value &&
      (value.startsWith('sb_secret_') || role(value) === 'service_role' || value === secret || value === rateSecret || value === env.IE_PROVIDER_TOKEN))) {
    issues.push('Variável NEXT_PUBLIC_* contém segredo de servidor: remova a exposição antes do build.');
  }
  if (Boolean(env.IE_PROVIDER_URL) !== Boolean(env.IE_PROVIDER_TOKEN)) {
    issues.push('IE_PROVIDER_URL e IE_PROVIDER_TOKEN: configure ambas ou deixe ambas vazias.');
  }
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issues = deploymentIssues(process.env);
  for (const issue of issues) console.error(`ERRO: ${issue}`);
  if (issues.length) process.exitCode = 1;
  else console.log('Configuração passou na verificação local. Chaves não foram autenticadas; confira migrations, Auth, SMTP e fluxos no domínio publicado conforme docs/deployment.md.');
}
