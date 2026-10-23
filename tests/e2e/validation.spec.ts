import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { validSchemaNfe } from "../fixtures/validation-fixtures";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("E2E somente com Supabase local.");
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
test("validador XSD real, editor, linha, histórico, originais e controle de acesso", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const email = `validator-ui-${randomUUID()}@example.test`,
    password = `Senha-${randomUUID()}!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;
  try {
    await page.goto("/entrar");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar na minha conta" }).click();
    await expect(page).toHaveURL(/\/painel$/);
    await page
      .getByRole("link", { name: "Validador de XML", exact: true })
      .click();
    const valid = validSchemaNfe();
    await page.getByLabel("Selecionar XML para validar").setInputFiles({
      name: "valido-schema.xml",
      mimeType: "application/xml",
      buffer: Buffer.from(valid),
    });
    await page.getByRole("button", { name: "Visualização formatada" }).click();
    await expect(page.getByText(/prévia formatada/)).toBeVisible();
    await page
      .getByRole("button", { name: "Código bruto", exact: true })
      .click();
    const resultPromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/validations?") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Validar XML", exact: true })
      .click();
    const response = await resultPromise;
    expect(response.status(), await response.text()).toBe(201);
    await expect(
      page.getByRole("heading", {
        name: "Sem erros nas verificações executadas",
      }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("validation-counts")).toContainText(
      "0 erro(s)",
    );
    const saved = await admin
      .from("xml_validations")
      .select("id,sha256,xsd_result")
      .eq("user_id", userId)
      .single();
    expect(saved.data?.xsd_result).toBe("passed");
    const id = saved.data!.id;
    const original = await page.request.get(
      `/api/validations/${id}?format=xml`,
    );
    expect(await original.text()).toBe(valid);
    const json = await page.request.get(`/api/validations/${id}?format=json`);
    expect((await json.json()).notVerified.join(" ")).toContain(
      "criptográfica",
    );
    expect((await request.get(`/api/validations/${id}`)).status()).toBe(401);
    expect(
      (
        await request.post("/api/validations", {
          headers: {
            Origin: "http://localhost:3000",
            "Content-Type": "application/xml",
          },
          data: valid,
        })
      ).status(),
    ).toBe(401);
    await page.getByRole("button", { name: "Editar uma cópia" }).click();
    await page.getByRole("button", { name: "Entendi, editar cópia" }).click();
    await page
      .getByTestId("xml-editor")
      .fill(valid.replace("<nNF>1</nNF>", ""));
    await page
      .getByRole("button", { name: "Validar XML", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Inconsistências identificadas",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByText("Mensagem original do validador").first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Ir à linha/ })
      .first()
      .click();
    await expect(page.getByTestId("xml-editor")).toBeFocused();
    await page
      .getByRole("button", { name: "valido-schema.xml", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Sem erros nas verificações executadas",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: ".artifacts/validator-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.evaluate(() =>
      window.scrollTo({ left: 1000, top: window.scrollY, behavior: "instant" }),
    );
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
    expect(
      await page.locator(".cm-scroller").evaluate((el) => {
        el.scrollLeft = 100;
        return el.scrollLeft;
      }),
    ).toBeGreaterThan(0);

    await page.screenshot({
      path: ".artifacts/validator-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Excluir validação valido-schema.xml",
        exact: true,
      })
      .last()
      .click();
    await page
      .getByRole("button", {
        name: "Excluir validação e original",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(
      (await admin.from("xml_validations").select("id").eq("id", id)).data,
    ).toEqual([]);

    await page.setViewportSize({ width: 1280, height: 900 });
    const headers = { Origin: "http://localhost:3000" };
    const batch = await page.request.post("/api/imports", {
      headers,
      data: { name: "Originais para validação" },
    });
    expect(batch.status()).toBe(201);
    const batchId = (await batch.json()).data.id;
    const uploaded = await page.request.post(
      `/api/imports/${batchId}/files?name=importado.xml`,
      {
        headers: { ...headers, "Content-Type": "application/xml" },
        data: valid,
      },
    );
    expect(uploaded.ok(), await uploaded.text()).toBe(true);
    const imported = await admin
      .from("import_files")
      .select("id,document_id")
      .eq("user_id", userId)
      .not("document_id", "is", null)
      .single();
    expect(imported.error).toBeNull();
    const fileId = imported.data!.id,
      documentId = imported.data!.document_id!;
    await page.goto(`/documentos/${documentId}`);
    await page
      .getByRole("link", { name: "Validar XML · importado.xml", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/validador\\?source=${fileId}$`));
    await expect(page.getByTestId("xml-editor")).toContainText("SINTÉTICO");
    await page
      .getByRole("button", { name: "Validar XML", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Sem erros nas verificações executadas",
      }),
    ).toBeVisible();
    const linked = await admin
      .from("xml_validations")
      .select("id,document_id")
      .eq("user_id", userId)
      .eq("document_id", documentId)
      .single();
    expect(linked.error).toBeNull();
    expect(
      (
        await page.request.delete(`/api/documents/${documentId}`, { headers })
      ).ok(),
    ).toBe(true);
    const retained = await admin
      .from("xml_validations")
      .select("document_id")
      .eq("id", linked.data!.id)
      .single();
    expect(retained.data?.document_id).toBeNull();
    expect(
      await (
        await page.request.get(`/api/validations/${linked.data!.id}?format=xml`)
      ).text(),
    ).toBe(valid);
    expect(
      (await page.request.delete(`/api/imports/${batchId}`, { headers })).ok(),
    ).toBe(true);
  } finally {
    const records = await admin
      .from("xml_validations")
      .select("original_path")
      .eq("user_id", userId);
    const paths = (records.data || [])
      .map((r) => r.original_path)
      .filter((p): p is string => Boolean(p));
    if (paths.length)
      expect(
        (await admin.storage.from("fiscal-xml").remove(paths)).error,
      ).toBeNull();
    expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
  }
});
