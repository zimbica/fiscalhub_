import process from 'node:process';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { deploymentIssues } from '../../scripts/deployment-preflight.mjs';

const valid = {
  NEXT_PUBLIC_APP_URL: 'https://fiscalhub.example',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
  SUPABASE_SECRET_KEY: 'sb_secret_synthetic',
  RATE_LIMIT_SECRET: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdefabcd',
};

test('accepts complete HTTPS configuration without contacting providers', () => {
  assert.deepEqual(deploymentIssues(valid), []);
});
test('requires all five deployment variables', () => {
  assert.equal(deploymentIssues({}).length, 5);
});
test('rejects local, insecure and credential-bearing URLs', () => {
  for (const url of ['http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://user:password@example.com', 'https://example.com/path', 'https://example.com?token=secret', 'https://example.com#secret']) {
    assert.ok(deploymentIssues({ ...valid, NEXT_PUBLIC_APP_URL: url }).length);
  }
});
test('rejects swapped keys and secrets exposed through any public variable', () => {
  assert.ok(deploymentIssues({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: valid.SUPABASE_SECRET_KEY }).length >= 2);
  for (const value of [valid.SUPABASE_SECRET_KEY, valid.RATE_LIMIT_SECRET]) {
    assert.ok(deploymentIssues({ ...valid, NEXT_PUBLIC_ACCIDENT: value }).some(issue => issue.includes('exposição')));
  }
});
test('detects legacy service_role exposure without treating JWT decoding as authentication', () => {
  const jwt = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;
  assert.ok(deploymentIssues({ ...valid, NEXT_PUBLIC_ACCIDENT: jwt }).some(issue => issue.includes('exposição')));
});
test('requires paired IE settings and rejects weak rate limit secrets', () => {
  assert.ok(deploymentIssues({ ...valid, IE_PROVIDER_URL: 'https://ie.example/query' }).length);
  assert.ok(deploymentIssues({ ...valid, RATE_LIMIT_SECRET: 'x'.repeat(64) }).length);
  assert.deepEqual(deploymentIssues({ ...valid, IE_PROVIDER_URL: 'https://ie.example/query', IE_PROVIDER_TOKEN: 'synthetic' }), []);
});
test('CLI fails safely without printing sensitive values', () => {
  const marker = 'sensitive-do-not-print';
  const result = spawnSync(process.execPath, ['scripts/deployment-preflight.mjs'], {
    env: { ...valid, SUPABASE_SECRET_KEY: marker, NEXT_PUBLIC_APP_URL: `https://user:${marker}@example.com` }, encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(marker));
});
