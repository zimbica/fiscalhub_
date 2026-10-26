import { expect, type Page } from '@playwright/test';
// Legacy test identities use the compatibility API; the public UI only offers nicknames.
export async function legacySession(page: Page, email: string, password: string) {
  const response = await page.request.post('/api/auth/login', { headers: { origin: 'http://localhost:3000' }, data: { email, password } });
  expect(response.status()).toBe(200);
  await page.goto('/painel');
}
