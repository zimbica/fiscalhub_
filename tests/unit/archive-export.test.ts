import { describe, it, expect } from "vitest";
import { ZipWriter, Uint8ArrayWriter, TextReader } from "@zip.js/zip.js";
import { expandFiles, checkArchiveEntry } from "@/lib/documents/archive";
import { csvCell } from "@/lib/documents/export";
import { documentFiltersSchema } from "@/lib/documents/filters";
import { fixtureNfe } from "../fixtures/fiscal-fixtures";
async function zip(entries: Record<string, string>) {
  const writer = new ZipWriter(new Uint8ArrayWriter(), {
    useWebWorkers: false,
  });
  for (const [name, value] of Object.entries(entries))
    await writer.add(name, new TextReader(value));
  return new File([new Uint8Array(await writer.close())], "lote.zip");
}
describe("ZIP e exportação", () => {
  it("extrai XML em subpasta, ignora outros arquivos e preserva os bytes", async () => {
    const xml = fixtureNfe();
    const file = await zip({ "pasta/nota.xml": xml, "leia.txt": "ignorado" });
    const result: { name: string; bytes?: Uint8Array }[] = [];
    const stats = await expandFiles([file], async (entry) => {
      result.push(entry);
    });
    expect(stats.ignored).toBe(1);
    expect(result).toHaveLength(1);
    expect(new TextDecoder().decode(result[0].bytes)).toBe(xml);
  });
  it("recusa expansão excessiva mesmo para ZIP pequeno", async () => {
    const entries: { error?: string }[] = [];
    await expandFiles(
      [await zip({ "grande.xml": "a".repeat(3 * 1024 * 1024) })],
      async (entry) => {
        entries.push(entry);
      },
    );
    expect(entries[0].error).toContain("2 MiB");
  });
  it("recusa caminhos de travessia, criptografia e razão excessiva", () => {
    const base = {
      filename: "nota.xml",
      uncompressedSize: 100,
      compressedSize: 50,
      encrypted: false,
    };
    expect(() =>
      checkArchiveEntry({ ...base, filename: "../nota.xml" }),
    ).toThrow(/inseguro/);
    expect(() => checkArchiveEntry({ ...base, encrypted: true })).toThrow(
      /criptografado/,
    );
    expect(() =>
      checkArchiveEntry({
        ...base,
        uncompressedSize: 100000,
        compressedSize: 1,
      }),
    ).toThrow(/expansão/);
  });
  it("limita XML selecionado diretamente e recusa formato incorreto", async () => {
    const result: { error?: string }[] = [];
    await expandFiles(
      [
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "nota.xml"),
        new File(["abc"], "nota.pdf"),
      ],
      async (entry) => {
        result.push(entry);
      },
    );
    expect(result.every((e) => e.error)).toBe(true);
  });
  it("neutraliza fórmulas em CSV, mantém aspas e centavos", () => {
    expect(csvCell('=HYPERLINK("malicioso")')).toBe(
      '"\'=HYPERLINK(""malicioso"")"',
    );
    expect(csvCell("\t+SUM(1)")).toContain("'");
    expect(csvCell("0.30")).toBe('"0.30"');
  });
  it("valida filtros e intervalos de datas no servidor", () => {
    expect(
      documentFiltersSchema.safeParse({
        start: "2026-10-22",
        end: "2026-10-01",
      }).success,
    ).toBe(false);
    expect(documentFiltersSchema.safeParse({ model: "57" }).success).toBe(
      false,
    );
    expect(documentFiltersSchema.safeParse({ min: "1e9" }).success).toBe(false);
  });
});
