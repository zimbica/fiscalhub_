import { legacySession } from './helpers/session';
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("E2E de rejeições exige Supabase local.");
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
test("rejeições: busca real, aproximação, ERP, fontes, favoritos e histórico privado", async ({
  page,
  request,
  browser,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const users: string[] = [];
  const credentials: { email: string; password: string }[] = [];
  try {
    for (let i = 0; i < 2; i++) {
      const email = `rejection-ui-${randomUUID()}@example.test`,
        password = `Senha-${randomUUID()}!`;
      const r = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (r.error) throw r.error;
      users.push(r.data.user.id);
      credentials.push({ email, password });
    }
    await legacySession(page, credentials[0].email, credentials[0].password);
    await expect(page).toHaveURL(/\/painel$/);
    await page
      .getByRole("link", { name: "Consulta de Rejeições", exact: true })
      .click();
    await expect(page.getByText(/8 rejeições revisadas/)).toBeVisible();
    const search = page.getByLabel("Código ou parte da mensagem");
    await search.fill("Rejeição 694");
    await search.press("Enter");
    const title = "Não informado o grupo de ICMS para a UF de destino";
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Como resolver?", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Oobj — Rejeição 694/ }),
    ).toHaveAttribute(
      "href",
      "https://oobj.com.br/bc/rejeicao-694-como-resolver/",
    );
    await page.getByRole("button", { name: "Favoritar rejeição 694" }).click();
    await expect(
      page.getByRole("button", { name: "Desfavoritar rejeição 694" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Copiar orientação" }).click();
    await expect(page.getByText("Orientação e fontes copiadas.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      "oobj.com.br/bc/rejeicao-694",
    );
    await page.getByRole("link", { name: "Voltar ao catálogo" }).click();
    await page.getByLabel("Somente favoritos").check();
    await expect(
      page
        .getByRole("region", { name: "Resultados de rejeições" })
        .locator("article"),
    ).toHaveCount(1);
    await page.getByLabel("Filtrar por modelo").selectOption("65");
    await expect(
      page.getByRole("heading", { name: "Nenhuma rejeição encontrada" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Limpar filtros", exact: true })
      .click();
    await search.fill("CFOP inexsitente");
    await search.press("Enter");
    await expect(
      page.getByRole("link", { name: "CFOP inexistente", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Identificar mensagem do ERP", exact: true })
      .click();
    const message = page.getByLabel("Cole a mensagem de rejeição");
    const secretKey = "35261012345678000195550010000000011123456781";
    await message.fill(`ERP: cStat: 694; chave ${secretKey}`);
    await page
      .getByRole("button", { name: "Identificar", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Correspondência pelo código informado" }),
    ).toBeVisible();
    const stored = await admin
      .from("search_history")
      .select("query")
      .eq("user_id", users[0]);
    expect(JSON.stringify(stored.data)).not.toContain(secretKey);
    expect(
      stored.data?.some((h) => h.query === "Mensagem ERP — código 694"),
    ).toBe(true);
    await message.fill("cStat: 9999 — Falha no schema XML");
    await page
      .getByRole("button", { name: "Identificar", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Não foi possível identificar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nenhuma rejeição encontrada" }),
    ).toBeVisible();
    await message.fill("Rejeição 694; cStat: 215");
    await page
      .getByRole("button", { name: "Identificar", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "mais de um código" }),
    ).toBeVisible();
    expect((await request.get("/api/rejections")).status()).toBe(401);
    expect((await request.get("/api/rejections/694")).status()).toBe(401);
    expect(
      (
        await page.request.post("/api/rejections", {
          headers: { Origin: "https://origem-invalida.test" },
          data: { query: "694" },
        })
      ).status(),
    ).toBe(403);
    const other = await browser.newContext({
      baseURL: "http://localhost:3000",
    });
    try {
      const p = await other.newPage();
      await legacySession(p, credentials[1].email, credentials[1].password);
      await expect(p).toHaveURL(/\/painel$/);
      expect(
        (await (await p.request.get("/api/rejections/history")).json()).data,
      ).toEqual([]);
      expect(
        (await (await p.request.get("/api/rejections/694")).json()).data
          .favorite,
      ).toBe(false);
    } finally {
      await other.close();
    }
    await page
      .getByRole("button", { name: "Limpar histórico", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar exclusão do histórico" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(
      (await admin.from("search_history").select("id").eq("user_id", users[0]))
        .data,
    ).toEqual([]);
    expect(
      (
        await admin
          .from("rejection_favorites")
          .select("rejection_id")
          .eq("user_id", users[0])
      ).data,
    ).toHaveLength(1);
    await page
      .getByRole("button", { name: "Limpar filtros", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Pesquisar", exact: true }),
    ).toBeEnabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: ".artifacts/rejections-mobile.png",
      fullPage: true,
    });
  } finally {
    for (const id of users)
      expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
  }
});
