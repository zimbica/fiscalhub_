import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('E2E executa apenas com Supabase local.');
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `a11y-${randomUUID()}@example.test`;
const password = `Segura-${randomUUID()}!`;
let userId: string;
test.use({ reducedMotion: 'reduce' });
test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Pessoa Acessibilidade' } });
  if (error) throw error;
  userId = data.user.id;
});
test.afterAll(async () => { if (userId) await admin.auth.admin.deleteUser(userId); });
async function audit(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }))).toEqual([]);
}

test('formulários públicos sem violações automáticas WCAG A/AA', async ({ page }) => {
  for (const path of ['/entrar', '/cadastro', '/recuperar-senha']) {
    await page.goto(path);
    await audit(page);
  }
});

test('áreas privadas, temas e menu móvel acessíveis', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page).toHaveURL(/\/painel$/);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, theme);
    for (const accent of ['blue', 'purple']) {
      await page.evaluate(accent => { document.documentElement.dataset.accent = accent; }, accent);
      await audit(page);
    }
  }
  for (const path of ['/documentos', '/validador', '/rejeicoes', '/configuracoes', '/historico', '/consulta-cnpj']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await audit(page);
  }
  await page.goto('/painel');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused();
});
