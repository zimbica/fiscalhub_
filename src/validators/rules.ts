import Decimal from "decimal.js";
import { child, children, value, type XmlNode } from "@/services/xml/tree";
import { validAccessKey } from "@/services/xml/parser";
import type { RuleCheck, ValidationIssue } from "@/types/validation";
export const RULE_VERSION = "2026-10-23.1";
export const RULE_SOURCE = {
  title: "MOC 7 — Anexo I; verificações locais de consistência",
  url: "https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf",
  version: RULE_VERSION,
  reviewedAt: "2026-10-23",
};
const D = Decimal.clone({ precision: 48 });
export const ruleDefinitions = [
  {
    id: "KEY_DV",
    title: "Dígito verificador da chave numérica",
    models: ["55", "65"],
    scope: "Chave numérica com 44 dígitos; algoritmo módulo 11 do MOC.",
  },
  {
    id: "CFOP_DIRECTION",
    title: "Prefixo do CFOP e tipo de operação",
    models: ["55", "65"],
    scope:
      "CFOP de quatro dígitos e tpNF 0/1; verifica direção, não existência ou adequação tributária.",
  },
  {
    id: "PRODUCT_SUM",
    title: "Total dos produtos sujeitos ao ICMS",
    models: ["55", "65"],
    scope:
      "W07: itens classificados ICMS/ISSQN e indTot 0/1; soma somente ICMS, indTot=1; tolerância 0,01.",
  },
  {
    id: "DISCOUNT_REVIEW",
    title: "Descontos dos itens e total",
    models: ["55", "65"],
    scope:
      "Conferência aritmética informativa; diferença gera alerta, não rejeição universal.",
  },
  {
    id: "DESTINATION_REVIEW",
    title: "UF de origem/destino e idDest",
    models: ["55", "65"],
    scope:
      "Apenas idDest 1/2, UFs nacionais, sem entrega/retirada alternativa; alerta sujeito às exceções do MOC.",
  },
  {
    id: "IBS_ARITHMETIC",
    title: "Soma declarada de IBS estadual e municipal",
    models: ["55", "65"],
    scope:
      "Somente grupos gIBSCBS com vIBS, gIBSUF/vIBSUF e gIBSMun/vIBSMun; sem inferir alíquotas, vigência ou obrigatoriedade.",
  },
] as const;
export function runLocalRules(root: XmlNode) {
  const checks: RuleCheck[] = [],
    issues: ValidationIssue[] = [];
  const info = child(root.name === "NFe" ? root : child(root, "NFe"), "infNFe");
  const ide = child(info, "ide");
  const model = value(ide, "mod");
  if (!info || !["55", "65"].includes(model || ""))
    return {
      checks: ruleDefinitions.map((r) => ({
        id: r.id,
        title: r.title,
        status: "not_verified" as const,
        reason: "Regra disponível somente para NF-e/NFC-e.",
      })),
      issues,
    };
  const record = (id: string, status: RuleCheck["status"], reason?: string) =>
    checks.push({
      id,
      title: ruleDefinitions.find((r) => r.id === id)!.title,
      status,
      reason,
    });
  const issue = (
    id: string,
    node: XmlNode | undefined,
    message: string,
    found: string,
    expected: string,
    severity: "error" | "warning" = "error",
  ) =>
    issues.push({
      ruleId: id,
      level: "rule",
      severity,
      message,
      tag: node?.name,
      xpath: node?.path,
      line: node?.line,
      column: node?.column,
      found,
      expected,
      reason: ruleDefinitions.find((r) => r.id === id)!.scope,
      suggestion:
        "Confira os campos no ERP e a documentação aplicável. Uma correção exige nova assinatura; não altere automaticamente o original.",
      source:
        id === "IBS_ARITHMETIC"
          ? {
              ...RULE_SOURCE,
              title:
                "XSD oficial PL 010f — grupo gIBSCBS; conferência aritmética local",
              url: "https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=8ITFuBLltXs%3D",
            }
          : RULE_SOURCE,
    });
  const key = (info.attributes.Id || "").replace(/^NFe/, "");
  if (/^\d{44}$/.test(key)) {
    const valid = validAccessKey(key);
    record("KEY_DV", valid ? "passed" : "failed");
    if (!valid)
      issue(
        "KEY_DV",
        info,
        "Dígito verificador da chave não confere.",
        key,
        "Chave com DV calculado por módulo 11.",
      );
  } else
    record(
      "KEY_DV",
      "not_verified",
      "Algoritmo local limitado a chave numérica.",
    );
  const items = children(info, "det"),
    tpNF = value(ide, "tpNF");
  let directionErrors = 0;
  for (const item of items) {
    const cfop = child(child(item, "prod"), "CFOP");
    const text = cfop?.text.trim() || "";
    if (
      /^[123567]\d{3}$/.test(text) &&
      ["0", "1"].includes(tpNF || "") &&
      Number(text[0]) < 4 !== (tpNF === "0")
    ) {
      directionErrors++;
      issue(
        "CFOP_DIRECTION",
        cfop,
        "Direção do CFOP difere de tpNF.",
        text,
        `CFOP de ${tpNF === "0" ? "entrada (1, 2, 3)" : "saída (5, 6, 7)"}.`,
      );
    }
  }
  record(
    "CFOP_DIRECTION",
    directionErrors
      ? "failed"
      : items.every((i) =>
            /^[123567]\d{3}$/.test(value(child(i, "prod"), "CFOP") || ""),
          ) && ["0", "1"].includes(tpNF || "")
        ? "passed"
        : "not_verified",
  );
  const total = child(child(info, "total"), "ICMSTot"),
    totalProducts = value(total, "vProd");
  const classified = items.every(
    (i) =>
      ["0", "1"].includes(value(child(i, "prod"), "indTot") || "") &&
      Boolean(
        child(child(i, "imposto"), "ICMS") ||
        child(child(i, "imposto"), "ISSQN"),
      ),
  );
  if (classified && totalProducts) {
    const sum = items.reduce(
      (sum, i) =>
        child(child(i, "imposto"), "ICMS") &&
        value(child(i, "prod"), "indTot") === "1"
          ? sum.plus(value(child(i, "prod"), "vProd") || "0")
          : sum,
      new D(0),
    );
    const valid = sum.minus(totalProducts).abs().lte("0.01");
    record("PRODUCT_SUM", valid ? "passed" : "failed");
    if (!valid)
      issue(
        "PRODUCT_SUM",
        child(total, "vProd"),
        "Total de produtos ICMS difere da soma dos itens incluídos.",
        totalProducts,
        sum.toFixed(2),
      );
  } else
    record(
      "PRODUCT_SUM",
      "not_verified",
      "Itens sem classificação ou total insuficiente.",
    );
  const discount = value(total, "vDesc");
  if (discount) {
    const sum = items.reduce(
      (sum, i) => sum.plus(value(child(i, "prod"), "vDesc") || "0"),
      new D(0),
    );
    const valid = sum.minus(discount).abs().lte("0.01");
    record("DISCOUNT_REVIEW", valid ? "passed" : "failed");
    if (!valid)
      issue(
        "DISCOUNT_REVIEW",
        child(total, "vDesc"),
        "Desconto total difere dos descontos dos itens; revisar operação.",
        discount,
        sum.toFixed(2),
        "warning",
      );
  } else record("DISCOUNT_REVIEW", "not_verified", "Desconto total ausente.");
  const origin = value(child(child(info, "emit"), "enderEmit"), "UF"),
    destination = value(child(child(info, "dest"), "enderDest"), "UF"),
    idDest = value(ide, "idDest");
  if (
    origin &&
    destination &&
    destination !== "EX" &&
    ["1", "2"].includes(idDest || "") &&
    !child(info, "entrega") &&
    !child(info, "retirada")
  ) {
    const valid = (origin === destination) === (idDest === "1");
    record("DESTINATION_REVIEW", valid ? "passed" : "failed");
    if (!valid)
      issue(
        "DESTINATION_REVIEW",
        child(ide, "idDest"),
        "idDest e UFs merecem análise das exceções fiscais.",
        `${idDest}: ${origin} → ${destination}`,
        "Compatibilidade conforme operação e exceções do MOC.",
        "warning",
      );
  } else
    record(
      "DESTINATION_REVIEW",
      "not_verified",
      "Condições insuficientes ou endereço alternativo; não inferir destino.",
    );
  let ibsChecks = 0,
    ibsErrors = 0;
  for (const item of items) {
    const group = child(child(child(item, "imposto"), "IBSCBS"), "gIBSCBS");
    const ibs = value(group, "vIBS"),
      uf = value(child(group, "gIBSUF"), "vIBSUF"),
      mun = value(child(group, "gIBSMun"), "vIBSMun");
    if (ibs && uf && mun) {
      ibsChecks++;
      const sum = new D(uf).plus(mun);
      if (sum.minus(ibs).abs().gt("0.01")) {
        ibsErrors++;
        issue(
          "IBS_ARITHMETIC",
          child(group, "vIBS"),
          "IBS declarado difere da soma estadual e municipal; revisar valores.",
          ibs,
          sum.toFixed(2),
          "warning",
        );
      }
    }
  }
  record(
    "IBS_ARITHMETIC",
    !ibsChecks ? "not_verified" : ibsErrors ? "failed" : "passed",
    !ibsChecks
      ? "Grupos explícitos suficientes não encontrados; obrigatoriedade e alíquotas não verificadas."
      : undefined,
  );
  return { checks, issues };
}
