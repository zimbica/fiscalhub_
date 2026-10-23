import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  extractCode,
  historyLabel,
  normalizeMessage,
  searchInput,
} from "@/lib/rejections/query";
import { catalogSchema, catalogSql } from "../../catalog/contract.mjs";
import catalog from "../../catalog/rejections.json";
describe("identificação conservadora de rejeições", () => {
  it.each([
    "694",
    "Rejeição 694: mensagem",
    "cStat: 694",
    "<cStat>694</cStat>",
    "694 - mensagem",
  ])("identifica código explícito em %s", (text) =>
    expect(extractCode(text)).toEqual({ code: "694", ambiguous: false }),
  );
  it.each([
    "nota 694",
    "35261012345678000195550010000000011123456781",
    "Rejeição 69400",
    "CFOP 6102",
  ])("não confunde identificador com rejeição: %s", (text) =>
    expect(extractCode(text).code).toBeNull(),
  );
  it("reconhece códigos ambíguos sem escolher arbitrariamente", () =>
    expect(extractCode("Rejeição 694; cStat: 215")).toEqual({
      code: null,
      ambiguous: true,
    }));
  it("normaliza acentos sem inventar correspondência semântica", () =>
    expect(normalizeMessage("Não informado o GRUPO.")).toBe(
      "nao informado o grupo",
    ));
  it("limita mensagem e filtros no servidor", () => {
    expect(searchInput.safeParse({ query: "x".repeat(501) }).success).toBe(
      false,
    );
    expect(searchInput.safeParse({ model: "57" }).success).toBe(false);
    expect(searchInput.safeParse({ page: 0 }).success).toBe(false);
  });
  it("não persiste mensagem ERP e oculta identificadores em busca comum", () => {
    expect(
      historyLabel(
        searchInput.parse({
          identify: true,
          query: "cStat 694 CPF 11144477735",
        }),
        "694",
      ),
    ).toBe("Mensagem ERP — código 694");
    expect(
      historyLabel(
        searchInput.parse({
          query:
            "111.444.777-35 12.345.678/0001-95 11144477735 pessoa@example.test",
        }),
        null,
      ),
    ).toBe("[CPF] [CNPJ] [identificador] [e-mail]");
  });
});
describe("catálogo editorial reproduzível", () => {
  it("exige códigos únicos, fonte oficial, Oobj e relacionamentos válidos", () => {
    expect(catalogSchema.parse(catalog).entries).toHaveLength(8);
    expect(
      catalogSchema.safeParse({
        ...catalog,
        entries: [catalog.entries[0], catalog.entries[0]],
      }).success,
    ).toBe(false);
    expect(
      catalogSchema.safeParse({
        ...catalog,
        entries: catalog.entries.map((e) => ({
          ...e,
          sources: e.sources.filter((s) => !s.is_official),
        })),
      }).success,
    ).toBe(false);
  });
  it("reproduz exatamente a migration inicial sem IDs fixos", async () => {
    expect(catalogSql(catalog)).toBe(
      await readFile(
        "supabase/migrations/20261023164912_rejection_catalog_initial.sql",
        "utf8",
      ),
    );
    expect(catalogSql(catalog)).toContain("on conflict(code) do update");
  });
});
