import { createHash } from "node:crypto";
import {
  parseXml,
  children,
  XmlImportError,
  type XmlNode,
} from "@/services/xml/tree";
import type { ValidationReport, ValidationIssue } from "@/types/validation";
import { selectSchema } from "./schemas";
import { validateXsd, XSD_ENGINE } from "./xsd";
import {
  runLocalRules,
  RULE_VERSION,
  RULE_SOURCE,
  ruleDefinitions,
} from "./rules";
export async function validateFiscalXml(
  bytes: Uint8Array,
  filename = "documento.xml",
): Promise<ValidationReport> {
  const report: ValidationReport = {
    createdAt: new Date().toISOString(),
    filename,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    documentType: null,
    model: null,
    layoutVersion: null,
    accessKey: null,
    structure: "not_verified",
    xsd: "not_verified",
    rules: "not_verified",
    schema: null,
    engine: XSD_ENGINE,
    ruleVersion: RULE_VERSION,
    issues: [],
    checks: [],
    checksRun: 0,
    errors: 0,
    warnings: 0,
    truncated: false,
    notVerified: [
      "Autorização ou situação atual na SEFAZ (nenhuma consulta online realizada).",
      "Autenticidade e validade criptográfica da assinatura/certificado.",
      "Regras completas por UF, vigência, regime e exceções das Notas Técnicas; cálculos/obrigatoriedade de IBS/CBS.",
      "Validade histórica: o leiaute 4.00 não identifica a revisão de pacote usada na emissão.",
    ],
  };
  let root: XmlNode;
  try {
    root = parseXml(bytes);
    report.structure = "passed";
    report.checksRun++;
  } catch (error) {
    if (!(error instanceof XmlImportError)) throw error;
    report.structure = "failed";
    report.checksRun++;
    const loc = error.message.match(/(?:^|\s)(\d+):(\d+):/);
    report.issues.push({
      severity: "error",
      level: "structure",
      ruleId: error.code,
      message: error.message,
      line: loc ? Number(loc[1]) : undefined,
      column: loc ? Number(loc[2]) + 1 : undefined,
      reason: "O XML não passou pelo parser seguro de estrutura e namespace.",
      suggestion:
        "Confira a sintaxe, o namespace oficial e a codificação UTF-8 no arquivo original.",
      source: {
        title: "XML 1.0 / namespace NF-e",
        url: "https://www.w3.org/TR/xml/",
        version: "XML 1.0",
        reviewedAt: "2026-10-23",
      },
    });
    return finish(report);
  }
  report.documentType = root.name;
  const info = child(root.name === "NFe" ? root : child(root, "NFe"), "infNFe");
  report.model = value(child(info, "ide"), "mod");
  report.layoutVersion =
    info?.attributes.versao || root.attributes.versao || null;
  report.accessKey =
    info?.attributes.Id?.replace(/^NFe/, "") ||
    value(
      child(root.name === "evento" ? root : child(root, "evento"), "infEvento"),
      "chNFe",
    );
  report.schema = selectSchema(root);
  if (!report.schema) {
    report.notVerified.push(
      "Não há schema instalado para este tipo, modelo ou versão; XSD não executado.",
    );
    return finish(report);
  }
  const output = await validateXsd(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    report.schema,
  );
  report.xsd = output.valid ? "passed" : "failed";
  report.checksRun++;
  if (!output.valid) {
    const nodes: XmlNode[] = [];
    const walk = (n: XmlNode) => {
      nodes.push(n);
      n.children.forEach(walk);
    };
    walk(root);
    const lines = output.rawOutput
      .split("\n")
      .filter(
        (l) =>
          l.includes("Schemas validity error") || l.includes("parser error"),
      );
    for (const raw of (lines.length ? lines : [output.rawOutput]).slice(
      0,
      200,
    )) {
      const loc = raw.match(/^documento\.xml:(\d+):/),
        line = loc ? Number(loc[1]) : undefined;
      const tag = raw.match(/Element '(?:\{[^}]+\})?([^']+)'/)?.[1];
      const candidates = nodes.filter(
        (n) => n.name === tag && (line === undefined || n.line === line),
      );
      const node = candidates.length === 1 ? candidates[0] : undefined;
      const issue: ValidationIssue = {
        severity: "error",
        level: "xsd",
        ruleId: "XSD",
        message: raw.replace(/^documento\.xml:\d+:\s*/, ""),
        rawMessage: raw,
        tag,
        line,
        xpath: node?.path,
        found: node?.text.trim().slice(0, 500) || undefined,
        expected: raw.match(/Expected is ([\s\S]+)/)?.[1],
        reason:
          "A estrutura não atende ao schema oficial selecionado; a mensagem é o retorno real do libxml2.",
        suggestion:
          "Revise a tag, sua ordem, obrigatoriedade e tipo conforme a mensagem e o XSD. Não aplique correções universais a grupos tributários.",
        source: {
          title: report.schema.title,
          url: report.schema.sourceUrl,
          version: report.schema.version,
          reviewedAt: "2026-10-23",
        },
      };
      report.issues.push(issue);
    }
    report.truncated = lines.length > 200;
    report.checks = ruleDefinitions.map((r) => ({
      id: r.id,
      title: r.title,
      status: "not_verified",
      reason:
        "Corrija primeiro os erros XSD para evitar conclusões sobre dados incompletos.",
    }));
  } else {
    const result = runLocalRules(root);
    report.checks = result.checks;
    report.issues.push(...result.issues);
    report.checksRun += result.checks.filter(
      (c) => c.status !== "not_verified",
    ).length;
    report.rules = result.checks.every((c) => c.status === "not_verified")
      ? "not_verified"
      : result.issues.some((i) => i.severity === "error")
        ? "failed"
        : "passed";
  }
  if (report.model && report.schema.id === "nfe-010f")
    report.issues.push({
      severity: "info",
      level: "rule",
      ruleId: "SCHEMA_REVISION",
      message:
        "Resultado referente ao pacote instalado PL 010f v1.04, não a todas as revisões históricas do leiaute 4.00.",
      reason: "NF-e 4.00 recebe atualizações sem alterar a versão do leiaute.",
      suggestion:
        "Confirme o pacote aplicável à data e ao ambiente de emissão antes de corrigir um documento histórico.",
      source: RULE_SOURCE,
    });
  return finish(report);
}
function finish(report: ValidationReport) {
  report.truncated ||= report.issues.length > 200;
  report.issues = report.issues.slice(0, 200);
  report.errors = report.issues.filter((i) => i.severity === "error").length;
  report.warnings = report.issues.filter(
    (i) => i.severity === "warning",
  ).length;
  return report;
}

function child(node: XmlNode | undefined, name: string) {
  return children(node, name)[0];
}

function value(node: XmlNode | undefined, name: string) {
  return child(node, name)?.text.trim() || null;
}
