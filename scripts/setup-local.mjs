import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (existsSync('.env.local')) {
  console.error('.env.local já existe. Preserve suas credenciais; remova ou renomeie o arquivo manualmente antes de gerar outro.');
  process.exit(1);
}
const result = JSON.parse(execFileSync('npx', ['supabase','status','-o','json'], { encoding:'utf8',stdio:['ignore','pipe','pipe'] }));
// CLI 2.x returns either flat env names or a structured status response.
const apiUrl = result.API_URL || result.api?.url;
const publishable = result.PUBLISHABLE_KEY || result.ANON_KEY || result.auth?.publishable_key;
const secret = result.SECRET_KEY || result.SERVICE_ROLE_KEY || result.auth?.secret_key;
if (!apiUrl || !publishable || !secret) {
  console.error('O Supabase local não retornou as credenciais esperadas. Verifique supabase status e a versão da CLI.');
  process.exit(1);
}
if (!['127.0.0.1','localhost'].includes(new URL(apiUrl).hostname)) throw new Error('Este script só configura Supabase local.');
const lines = [
  'NEXT_PUBLIC_APP_URL=http://localhost:3000',
  `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
  `SUPABASE_SECRET_KEY=${secret}`,
  `RATE_LIMIT_SECRET=${randomBytes(32).toString('hex')}`,
];
writeFileSync('.env.local', lines.join('\n')+'\n', { mode:0o600,flag:'wx' });
console.log('.env.local criado com as credenciais do ambiente local. Nenhuma credencial foi exibida.');
