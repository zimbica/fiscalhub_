import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { validateXsd } from "@/validators/xsd";
import { selectSchema } from "@/validators/schemas";
import { parseXml } from "@/services/xml/tree";
import { validateFiscalXml } from "@/validators/validate";
import {
  validSchemaNfe,
  validSchemaEvent,
  validSchemaReform,
} from "../fixtures/validation-fixtures";
const validate = (xml: string) =>
  validateFiscalXml(new TextEncoder().encode(xml));
describe("validação real XSD oficial e regras locais", () => {
  it.each(["nfe-55", "nfce-65", "ibscbs", "cancelamento", "ordem-invalida"])(
    "fixture em arquivo %s preserva resultado esperado",
    async (name) => {
      const r = await validate(
        await readFile(`tests/fixtures/xsd/${name}.xml`, "utf8"),
      );
      expect(r.xsd).toBe(name === "ordem-invalida" ? "failed" : "passed");
    },
  );
  it.each(["55", "65"])(
    "aceita estrutura XSD do modelo %s sem afirmar assinatura/autorização",
    async (model) => {
      const r = await validate(validSchemaNfe(model));
      expect(r.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(r.xsd).toBe("passed");
      expect(r.schema?.version).toContain("010f");
      expect(r.notVerified.join(" ")).toContain("criptográfica");
    },
  );
  it("valida grupos IBS/CBS e acusa ordem incorreta dentro do grupo real", async () => {
    const xml = validSchemaReform();
    const ok = await validate(xml);
    expect(ok.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(ok.xsd).toBe("passed");
    expect(ok.checks.find((c) => c.id === "IBS_ARITHMETIC")?.status).toBe(
      "passed",
    );
    const wrong = xml
      .replace("<vIBS>0.01</vIBS>", "")
      .replace("<gIBSCBS>", "<gIBSCBS><vIBS>0.01</vIBS>");
    const invalid = await validate(wrong);
    expect(invalid.xsd).toBe("failed");
    expect(invalid.issues.some((i) => i.tag === "vIBS")).toBe(true);
  });
  it("encerra o worker quando o prazo expira", async () => {
    const xml = validSchemaNfe();
    const schema = selectSchema(parseXml(new TextEncoder().encode(xml)))!;
    await expect(validateXsd(xml, schema, 1)).rejects.toThrow(/tempo/);
  });
  it("valida evento de cancelamento oficial", async () =>
    expect((await validate(validSchemaEvent())).xsd).toBe("passed"));
  it("recusa ordem incorreta com mensagem real e localização", async () => {
    const r = await validate(
      validSchemaNfe().replace(
        "<mod>55</mod>\n<serie>1</serie>",
        "<serie>1</serie>\n<mod>55</mod>",
      ),
    );
    expect(r.xsd).toBe("failed");
    expect(r.issues[0].rawMessage).toContain("Schemas validity error");
    expect(r.issues[0].line).toBeGreaterThan(1);
  });
  it("detecta campo obrigatório ausente", async () => {
    const r = await validate(validSchemaNfe().replace("<nNF>1</nNF>", ""));
    expect(r.xsd).toBe("failed");
    expect(r.issues.map((i) => i.message).join(" ")).toContain("nNF");
  });
  it("recusa XML malformado e XXE antes do WASM", async () => {
    for (const xml of [
      "<NFe>",
      '<!DOCTYPE NFe [<!ENTITY x SYSTEM "file:///etc/passwd">]><NFe>&x;</NFe>',
    ]) {
      const r = await validate(xml);
      expect(r.structure).toBe("failed");
      expect(r.xsd).toBe("not_verified");
    }
  });
  it("não finge validar modelo/versão não instalados", async () => {
    const r = await validate(
      validSchemaNfe().replaceAll('versao="4.00"', 'versao="3.10"'),
    );
    expect(r.xsd).toBe("not_verified");
  });
  it.each(["nNF", "mod"])(
    "XSD detecta %s repetido sem falha interna",
    async (tag) => {
      const v = tag === "mod" ? "55" : "1",
        field = `<${tag}>${v}</${tag}>`;
      const r = await validate(validSchemaNfe().replace(field, field + field));
      expect(r.xsd).toBe("failed");
    },
  );
  it("distingue direção CFOP de alerta de destino e não exige IBS ausente", async () => {
    const r = await validate(
      validSchemaNfe()
        .replaceAll("<CFOP>5102</CFOP>", "<CFOP>1102</CFOP>")
        .replace("<idDest>1</idDest>", "<idDest>2</idDest>"),
    );
    expect(r.xsd).toBe("passed");
    expect(r.issues.find((i) => i.ruleId === "CFOP_DIRECTION")?.severity).toBe(
      "error",
    );
    expect(
      r.issues.find((i) => i.ruleId === "DESTINATION_REVIEW")?.severity,
    ).toBe("warning");
    expect(r.checks.find((c) => c.id === "IBS_ARITHMETIC")?.status).toBe(
      "not_verified",
    );
  });
  it("alerta de soma IBS cita o pacote da reforma", async () => {
    const r = await validate(
      validSchemaReform().replaceAll("<vIBS>0.01</vIBS>", "<vIBS>0.05</vIBS>"),
    );
    expect(r.xsd).toBe("passed");
    expect(r.issues.find((i) => i.ruleId === "IBS_ARITHMETIC")).toMatchObject({
      severity: "warning",
      source: { title: expect.stringContaining("010f") },
    });
  });
  it("regra monetária usa decimal exato e tolerância", async () => {
    const r = await validate(
      validSchemaNfe().replace("<vProd>0.30</vProd>", "<vProd>0.40</vProd>"),
    );
    expect(r.xsd).toBe("passed");
    expect(r.issues.find((i) => i.ruleId === "PRODUCT_SUM")).toMatchObject({
      severity: "error",
      expected: "0.30",
    });
  });
});
