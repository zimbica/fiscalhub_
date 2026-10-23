import { describe, it, expect } from "vitest";
import { parseFiscalXml, validAccessKey } from "@/services/xml/parser";
import { parseXml, XmlImportError } from "@/services/xml/tree";
import {
  fixtureNfe,
  fixtureEvent,
  fixtureKey,
} from "../fixtures/fiscal-fixtures";
const bytes = (xml: string) => new TextEncoder().encode(xml);
const doc = (xml: string) => {
  const parsed = parseFiscalXml(bytes(xml));
  if (parsed.kind !== "document") throw new Error("Expected document");
  return parsed.document;
};
describe("extração de XMLs fiscais (sem afirmação de validade XSD)", () => {
  it.each(["55", "65"])(
    "extrai modelo %s com precisão decimal, dados e protocolo",
    (model) => {
      const result = doc(fixtureNfe({ model }));
      expect(result.model).toBe(model);
      expect(result.total_value).toBe("0.30");
      expect(result.items).toHaveLength(2);
      expect(result.items[0].quantity).toBe("1.0000000000");
      expect(result.base_status).toBe("authorized");
      expect(result.issued_at).not.toBe(result.authorized_at);
      expect(result.payments[0].value).toBe("0.30");
      expect(result.issues.some((i) => i.code === "PRODUCT_SUM")).toBe(false);
      expect(validAccessKey(result.access_key)).toBe(true);
    },
  );
  it("NFe sem protocolo permanece não confirmada", () => {
    const result = doc(fixtureNfe({ authorized: false }));
    expect(result.base_status).toBe("unconfirmed");
    expect(result.authorized_at).toBeNull();
  });
  it("devolução não é cancelamento", () => {
    const result = doc(fixtureNfe({ purpose: "4" }));
    expect(result.purpose).toBe("4");
    expect(result.base_status).toBe("authorized");
  });
  it("normaliza namespaces com prefixo e espaços sem alterar o hash do conteúdo", () => {
    const xml = fixtureNfe({ authorized: false });
    const prefixed = xml
      .replace("xmlns=", "xmlns:n=")
      .replace(/<(\/?)([a-zA-Z][\w]*)/g, "<$1n:$2");
    expect(doc(prefixed).content_hash).toBe(doc(xml).content_hash);
    expect(doc(xml.replaceAll("><", ">\n  <")).content_hash).toBe(
      doc(xml).content_hash,
    );
  });
  it("não usa protocolo de outra chave ou ambiente", () => {
    expect(
      doc(
        fixtureNfe().replace(
          `<chNFe>${fixtureKey()}</chNFe>`,
          `<chNFe>${fixtureKey("55", 2)}</chNFe>`,
        ),
      ).base_status,
    ).toBe("unconfirmed");
  });
  it("confere soma de produtos com decimal exato e indTot", () => {
    const changed = fixtureNfe().replace(
      "<vProd>0.30</vProd>",
      "<vProd>0.31</vProd>",
    );
    expect(doc(changed).issues.some((i) => i.code === "PRODUCT_SUM")).toBe(
      false,
    );
    expect(
      doc(
        changed.replace("<vProd>0.31</vProd>", "<vProd>0.35</vProd>"),
      ).issues.find((i) => i.code === "PRODUCT_SUM"),
    ).toMatchObject({ severity: "inconsistency", expected: "0.30" });
    const excluded = fixtureNfe()
      .replace("<indTot>1</indTot>", "<indTot>0</indTot>")
      .replace("<vProd>0.30</vProd>", "<vProd>0.20</vProd>");
    expect(doc(excluded).issues.some((i) => i.code === "PRODUCT_SUM")).toBe(
      false,
    );
  });
  it("não inclui item sujeito ao ISSQN no total de produtos sujeitos ao ICMS", () => {
    const xml = fixtureNfe()
      .replace(
        "<ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>",
        "<ISSQN><vBC>0.10</vBC></ISSQN>",
      )
      .replace("<vProd>0.30</vProd>", "<vProd>0.20</vProd>");
    expect(doc(xml).issues.some((i) => i.code === "PRODUCT_SUM")).toBe(false);
  });
  it("total vNF divergente gera alerta, não rejeição fiscal universal", () =>
    expect(
      doc(fixtureNfe({ total: "100.00" })).issues.find(
        (i) => i.code === "TOTAL_REVIEW",
      )?.severity,
    ).toBe("warning"));
  it("preserva IBS/CBS e extrai totais sem somar grupos pais e filhos", () => {
    const result = doc(fixtureNfe({ reform: true }));
    expect(result.tax_totals.vIBS).toBe("0.02");
    expect(result.tax_totals.vCBS).toBe("0.04");
    expect(JSON.stringify(result.items[0].taxes)).toContain("gIBSUF");
    expect(result.issues.some((i) => i.code === "TOTAL_REVIEW")).toBe(false);
  });
  it("processa mil documentos sequencialmente com chaves distintas e valores exatos", () => {
    const keys = new Set<string>();
    for (let number = 1; number <= 1000; number++) {
      const result = doc(fixtureNfe({ number }));
      keys.add(result.access_key);
      expect(result.total_value).toBe("0.30");
    }
    expect(keys.size).toBe(1000);
  });
  it("identifica DV inválido sem impedir análise do arquivo", () => {
    expect(validAccessKey(fixtureKey().slice(0, 43) + "9")).toBe(false);
  });
  it.each([
    "<NFe>",
    '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><a></NFe>',
    '<NFe xmlns="http://outro.example"/>',
    '<!DOCTYPE NFe [<!ENTITY x SYSTEM "file:///etc/passwd">]><NFe xmlns="http://www.portalfiscal.inf.br/nfe">&x;</NFe>',
  ])("recusa XML malformado/namespace/XXE", (xml) =>
    expect(() => parseFiscalXml(bytes(xml))).toThrow(XmlImportError),
  );
  it("limita tamanho, profundidade e campos essenciais", () => {
    expect(() => parseXml(new Uint8Array(2 * 1024 * 1024 + 1))).toThrow(
      /2 MiB/,
    );
    expect(() =>
      parseXml(
        bytes(
          '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">' +
            "<a>".repeat(65) +
            "</a>".repeat(65) +
            "</NFe>",
        ),
      ),
    ).toThrow(/complexidade/);
    expect(() => doc(fixtureNfe().replace("<vNF>0.30</vNF>", ""))).toThrow(
      /vNF/,
    );
    expect(() =>
      doc(fixtureNfe().replace("2026-10-20T10:00:00-03:00", "2026-10-20")),
    ).toThrow(/Data/);
  });
  it("recusa data de calendário impossível", () =>
    expect(() =>
      doc(
        fixtureNfe().replace(
          "2026-10-20T10:00:00-03:00",
          "2026-02-31T10:00:00-03:00",
        ),
      ),
    ).toThrow(/calendário/));
  it("recusa grupos ambíguos, item duplicado e conteúdo monetário inválido", () => {
    expect(() =>
      doc(
        fixtureNfe().replace(
          "<vNF>0.30</vNF>",
          "<vNF>0.30</vNF><vNF>0.30</vNF>",
        ),
      ),
    ).toThrow(/repetido/);
    expect(() => doc(fixtureNfe().replace('nItem="2"', 'nItem="1"'))).toThrow(
      /repetida/,
    );
    expect(() =>
      doc(fixtureNfe().replace("<vNF>0.30</vNF>", "<vNF>1e3</vNF>")),
    ).toThrow(/decimal/);
  });
});
describe("eventos importados", () => {
  it.each(["135", "155"])("reconhece retorno vinculado %s", (code) => {
    const result = parseFiscalXml(bytes(fixtureEvent({ code })));
    expect(result.kind).toBe("event");
    if (result.kind === "event") expect(result.event.accepted).toBe(true);
  });
  it.each([{ requestOnly: true }, { code: "136" }, { code: "573" }])(
    "não confirma cancelamento sem retorno aceito %j",
    (options) => {
      const result = parseFiscalXml(bytes(fixtureEvent(options)));
      if (result.kind === "event") expect(result.event.accepted).toBe(false);
    },
  );
  it("recusa pedido e retorno incompatíveis", () =>
    expect(() =>
      parseFiscalXml(
        bytes(
          fixtureEvent()
            .replace("<cStat>135</cStat>", "<cStat>135</cStat>")
            .replace(
              "<chNFe>" + fixtureKey() + "</chNFe>",
              "<chNFe>" + fixtureKey("55", 2) + "</chNFe>",
            ),
        ),
      ),
    ).toThrow(/divergem/));
});
