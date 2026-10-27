import { legacySession } from "./helpers/session";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  ZipWriter,
  ZipReader,
  Uint8ArrayWriter,
  Uint8ArrayReader,
  TextReader,
  TextWriter,
} from "@zip.js/zip.js";
import {
  fixtureNfe,
  fixtureEvent,
  fixtureKey,
} from "../fixtures/fiscal-fixtures";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("E2E exige Supabase local.");
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test("XML/ZIP, retomada, filtros, gráficos, originais, CSV/Excel e exclusão real", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const email = `xml-e2e-${randomUUID()}@example.test`,
    password = `Senha-${randomUUID()}!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;
  try {
    await legacySession(page, email, password);
    await expect(page).toHaveURL(/\/painel$/);
    await page.goto("/documentos");
    await expect(page.getByTestId("document-count")).toHaveCount(1);
    await expect(page.getByTestId("document-count")).toHaveText("0");
    await page.getByLabel("Nome do lote").fill("XMLs de teste");
    await page
      .getByLabel("Selecionar XMLs ou ZIPs")
      .setInputFiles([
        "tests/fixtures/xml/nfe-55.xml",
        "tests/fixtures/xml/nfce-65.xml",
        "tests/fixtures/xml/malformado.xml",
      ]);
    await page
      .getByRole("button", { name: "Iniciar importação", exact: true })
      .click();
    await expect(page.getByTestId("document-count")).toHaveText("2", {
      timeout: 60000,
    });
    const firstRow = page.getByRole("row").filter({ hasText: "XMLs de teste" });
    await expect(firstRow).toContainText("Concluído");
    const persisted = await admin
      .from("fiscal_documents")
      .select("id,status")
      .eq("user_id", userId);
    expect(persisted.data).toHaveLength(2);
    const files = await admin
      .from("import_files")
      .select("id,outcome,document_id")
      .eq("user_id", userId);
    expect(files.data?.filter((f) => f.outcome === "invalid")).toHaveLength(1);
    const originalFile = files.data!.find((f) => f.document_id)!;
    const original = await page.request.get(
      `/api/import-files/${originalFile.id}`,
    );
    expect(original.status()).toBe(200);
    expect(original.headers()["content-disposition"]).toContain("attachment");
    expect(
      (await request.get(`/api/import-files/${originalFile.id}`)).status(),
    ).toBe(401);
    const allStored = await admin
      .from("import_files")
      .select("original_path")
      .eq("user_id", userId);
    const originalPath = allStored.data!.find(
      (f) => f.original_path,
    )!.original_path!;
    expect(
      (
        await request.get(
          `${url}/storage/v1/object/public/fiscal-xml/${originalPath}`,
        )
      ).ok(),
    ).toBe(false);
    await page.getByLabel("Modelo", { exact: true }).selectOption("65");
    await page
      .getByRole("button", { name: "Aplicar filtros", exact: true })
      .click();
    await expect(page.getByTestId("document-count")).toHaveText("1");
    const csvPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    const csv = await csvPromise;
    expect(csv.suggestedFilename()).toMatch(/\.csv$/);
    const csvText = await readFile((await csv.path())!, "utf8");
    expect(csvText).toContain(fixtureKey("65", 2));
    expect(csvText).not.toContain(fixtureKey());
    const xlsx = await page.request.get(
      "/api/documents/export?model=65&format=xlsx",
    );
    expect(xlsx.status()).toBe(200);
    const zipReader = new ZipReader(
      new Uint8ArrayReader(new Uint8Array(await xlsx.body())),
      { useWebWorkers: false },
    );
    const sheets = await zipReader.getEntries();
    const sheet = sheets.find((e) => e.filename === "xl/worksheets/sheet1.xml");
    expect(sheet).toBeDefined();
    if (sheet && !sheet.directory) {
      const xml = await sheet.getData(new TextWriter(), {
        useWebWorkers: false,
      });
      expect(xml).not.toContain("<f>");
    }
    await zipReader.close();
    await page.getByRole("button", { name: "Limpar", exact: true }).click();
    await expect(page.getByTestId("document-count")).toHaveText("2");
    const writer = new ZipWriter(new Uint8ArrayWriter(), {
      useWebWorkers: false,
    });
    await writer.add("copia.xml", new TextReader(fixtureNfe()));
    await writer.add(
      "eventos/cancelamento.xml",
      new TextReader(fixtureEvent()),
    );
    const zipBuffer = Buffer.from(await writer.close());
    await page.getByLabel("Nome do lote").fill("Eventos e cópias");
    await page.getByLabel("Selecionar XMLs ou ZIPs").setInputFiles({
      name: "erp.zip",
      mimeType: "application/zip",
      buffer: zipBuffer,
    });
    await page
      .getByRole("button", { name: "Iniciar importação", exact: true })
      .click();
    const zipRow = page
      .getByRole("row")
      .filter({ hasText: "Eventos e cópias" });
    await expect(zipRow).toContainText("Concluído", { timeout: 60000 });
    await expect(
      page.getByRole("cell", {
        name: "Cancelamento identificado",
        exact: true,
      }),
    ).toBeVisible();
    const imports = await admin
      .from("xml_imports")
      .select("id,processed_files,duplicate_files")
      .eq("user_id", userId)
      .eq("name", "Eventos e cópias")
      .single();
    expect(imports.data?.processed_files).toBe(2);
    expect(imports.data?.duplicate_files).toBe(1);
    await zipRow.getByRole("button", { name: "Retomar", exact: true }).click();
    await page.getByLabel("Selecionar XMLs ou ZIPs").setInputFiles({
      name: "erp.zip",
      mimeType: "application/zip",
      buffer: zipBuffer,
    });
    await page
      .getByRole("button", { name: "Retomar lote", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Iniciar importação", exact: true }),
    ).toBeVisible();
    expect(
      (
        await admin
          .from("xml_imports")
          .select("processed_files")
          .eq("id", imports.data!.id)
          .single()
      ).data?.processed_files,
    ).toBe(2);
    await expect(
      page.getByRole("heading", { name: "Evolução de valores por dia" }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: ".artifacts/documents-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: ".artifacts/documents-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("link", { name: "NF-e 1 / 1", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "NF-e 1 · Série 1" }),
    ).toBeVisible();
    await expect(
      page.getByText("Cancelamento identificado · Homologação · Leiaute 4.00"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Eventos identificados (1)" }),
    ).toBeVisible();
    const downloadOriginal = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "Baixar XML original" })
      .first()
      .click();
    const raw = await readFile(
      (await (await downloadOriginal).path())!,
      "utf8",
    );
    expect(raw).toBe(fixtureNfe());
    await page.goto("/documentos");
    await page
      .getByRole("button", {
        name: "Excluir lote Eventos e cópias",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Excluir lote e arquivos", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("cell", {
        name: "Cancelamento identificado",
        exact: true,
      }),
    ).not.toBeVisible();
    await page.getByRole("link", { name: "NF-e 1 / 1", exact: true }).click();
    await page
      .getByRole("button", { name: "Excluir documento", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Excluir documento e arquivos",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/documentos$/);
    await expect(page.getByTestId("document-count")).toHaveText("1");
    await page
      .getByRole("button", { name: "Excluir lote XMLs de teste", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Excluir lote e arquivos", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByTestId("document-count")).toHaveText("0");
    expect(
      (await admin.from("import_files").select("id").eq("user_id", userId))
        .data,
    ).toEqual([]);
  } finally {
    const files = await admin
      .from("import_files")
      .select("original_path")
      .eq("user_id", userId);
    const paths = (files.data || [])
      .map((f) => f.original_path)
      .filter((p): p is string => Boolean(p));
    if (paths.length) await admin.storage.from("fiscal-xml").remove(paths);
    expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
  }
});

test("lote de mil XMLs em ZIP com pausa e retomada", async ({ page }) => {
  test.skip(process.env.BULK_XML_TEST !== "1", "Teste de volume local opt-in.");
  test.setTimeout(600000);
  const email = `bulk-${randomUUID()}@example.test`,
    password = `Senha-${randomUUID()}!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;
  try {
    const writer = new ZipWriter(new Uint8ArrayWriter(), {
      useWebWorkers: false,
    });
    for (let number = 1; number <= 1000; number++)
      await writer.add(
        `notas/nota-${number}.xml`,
        new TextReader(fixtureNfe({ number })),
      );
    const buffer = Buffer.from(await writer.close());
    await legacySession(page, email, password);
    await expect(page).toHaveURL(/\/painel$/);
    await page.goto("/documentos");
    await page.getByLabel("Nome do lote").fill("Volume 1000");
    await page
      .getByLabel("Selecionar XMLs ou ZIPs")
      .setInputFiles({ name: "mil.zip", mimeType: "application/zip", buffer });
    await page
      .getByRole("button", { name: "Iniciar importação", exact: true })
      .click();
    await expect
      .poll(
        async () => {
          const r = await admin
            .from("import_files")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId);
          return r.count || 0;
        },
        { timeout: 60000 },
      )
      .toBeGreaterThan(4);
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: "Volume 1000" });
    await expect(row).toContainText("Interrompido");
    await row.getByRole("button", { name: "Retomar", exact: true }).click();
    await page
      .getByLabel("Selecionar XMLs ou ZIPs")
      .setInputFiles({ name: "mil.zip", mimeType: "application/zip", buffer });
    await page
      .getByRole("button", { name: "Retomar lote", exact: true })
      .click();
    await expect(page.getByTestId("document-count")).toHaveText("1000", {
      timeout: 540000,
    });
    await expect(row).toContainText("Concluído");
    const job = await admin
      .from("xml_imports")
      .select("processed_files,error_count")
      .eq("user_id", userId)
      .single();
    expect(job.data).toMatchObject({ processed_files: 1000, error_count: 0 });
    const report = await page.request.get("/api/documents");
    expect((await report.json()).data.metrics.total).toBe("300.00");
  } finally {
    const records = await admin
      .from("import_files")
      .select("original_path")
      .eq("user_id", userId)
      .limit(10000);
    const paths = (records.data || [])
      .map((r) => r.original_path)
      .filter((p): p is string => Boolean(p));
    for (let i = 0; i < paths.length; i += 100)
      await admin.storage.from("fiscal-xml").remove(paths.slice(i, i + 100));
    expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
  }
});
