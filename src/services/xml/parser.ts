import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import type {
  FiscalDocument,
  FiscalEvent,
  FiscalIssue,
  ParsedFiscalFile,
} from "@/types/fiscal";
import {
  parseXml,
  child,
  children,
  value,
  required,
  plain,
  canonical,
  leafValues,
  XmlImportError,
  type XmlNode,
} from "./tree";
export const MOC_SOURCE =
  "https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf";
const D = Decimal.clone({ precision: 48 });
function decimal(
  text: string | null,
  field: string,
  scale = 2,
  optional = false,
) {
  if (text === null && optional) return "0";
  if (
    text === null ||
    !new RegExp(
      `^\\d{1,${scale === 2 ? 13 : 11}}(?:\\.\\d{1,${scale}})?$`,
    ).test(text)
  )
    throw new XmlImportError(`Valor decimal ausente ou inválido: ${field}.`);
  return new D(text).toFixed(scale);
}
function timestamp(text: string | null, field: string, optional = false) {
  if (!text && optional) return null;
  if (
    !text ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(text) ||
    Number.isNaN(Date.parse(text))
  )
    throw new XmlImportError(`Data/hora inválida ou sem fuso: ${field}.`);
  const [year, month, day] = text.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  )
    throw new XmlImportError(`Data de calendário inválida: ${field}.`);
  return text;
}
export function validAccessKey(key: string) {
  if (!/^\d{44}$/.test(key)) return false;
  let sum = 0,
    weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(key[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  return Number(key[43]) === (remainder < 2 ? 0 : 11 - remainder);
}
function accessKey(text: string) {
  if (!/^\d{44}$/.test(text))
    throw new XmlImportError("Chave de acesso deve conter 44 dígitos.");
  return text;
}
function environment(node: XmlNode | undefined) {
  const env = required(node, "tpAmb");
  if (env !== "1" && env !== "2")
    throw new XmlImportError(
      "Ambiente deve ser produção (1) ou homologação (2).",
    );
  return env;
}
function parseDocument(root: XmlNode): FiscalDocument {
  const nfe = root.name === "NFe" ? root : child(root, "NFe");
  const info = child(nfe, "infNFe");
  if (!info) throw new XmlImportError("Grupo infNFe ausente.");
  const key = accessKey((info.attributes.Id || "").replace(/^NFe/, ""));
  const ide = child(info, "ide"),
    emit = child(info, "emit"),
    dest = child(info, "dest");
  const model = required(ide, "mod");
  if (model !== "55" && model !== "65")
    throw new XmlImportError(
      "Esta etapa aceita apenas NF-e (55) e NFC-e (65).",
    );
  if (info.attributes.versao !== "4.00")
    throw new XmlImportError(
      "Leiaute não suportado para extração: esperado NF-e/NFC-e 4.00.",
    );
  const env = environment(ide);
  const issues: FiscalIssue[] = [];
  const warn = (
    code: string,
    message: string,
    path: string,
    severity: FiscalIssue["severity"] = "warning",
    found?: string,
    expected?: string,
  ) =>
    issues.push({
      code,
      message,
      path,
      severity,
      source: MOC_SOURCE,
      found,
      expected,
    });
  if (!validAccessKey(key))
    warn(
      "KEY_DV",
      "Dígito verificador da chave não confere.",
      "/NFe/infNFe/@Id",
      "inconsistency",
    );
  if (key.slice(20, 22) !== model)
    warn(
      "KEY_MODEL",
      "Modelo na chave difere do campo mod.",
      "/NFe/infNFe/ide/mod",
      "inconsistency",
    );
  const issued = timestamp(required(ide, "dhEmi"), "dhEmi")!;
  let authorized: string | null = null;
  let status: FiscalDocument["base_status"] = "unconfirmed";
  let evidence: unknown = [];
  const protocol = child(child(root, "protNFe"), "infProt");
  if (protocol) {
    const code = value(protocol, "cStat"),
      received = timestamp(value(protocol, "dhRecbto"), "dhRecbto", true),
      number = value(protocol, "nProt");
    const matching =
      value(protocol, "chNFe") === key && value(protocol, "tpAmb") === env;
    evidence = [
      {
        source: "XML importado; assinatura e autenticidade não verificadas",
        statusCode: code,
        protocol: number,
        receivedAt: received,
        key: value(protocol, "chNFe"),
        environment: value(protocol, "tpAmb"),
      },
    ];
    if (!matching)
      warn(
        "PROTOCOL_MISMATCH",
        "Protocolo pertence a outra chave ou ambiente; situação não confirmada.",
        "/nfeProc/protNFe",
      );
    else if (number && received && ["100", "150"].includes(code || "")) {
      status = "authorized";
      authorized = received;
    } else if (
      number &&
      received &&
      ["110", "301", "302", "303"].includes(code || "")
    )
      status = "denied";
    else
      warn(
        "PROTOCOL_UNCONFIRMED",
        "Retorno importado não comprova autorização deste documento.",
        "/nfeProc/protNFe",
      );
  }
  if (
    authorized &&
    new Date(issued).getTime() !== new Date(authorized).getTime()
  )
    warn(
      "DIFFERENT_TIMESTAMPS",
      "Emissão e autorização têm horários diferentes; confira o intervalo conforme a operação.",
      "/nfeProc/protNFe/infProt/dhRecbto",
    );
  const total = child(info, "total"),
    icms = child(total, "ICMSTot");
  if (!icms)
    throw new XmlImportError(
      "Grupo ICMSTot ausente; não foi possível extrair valores.",
    );
  const items = children(info, "det").map((det, index) => {
    const prod = child(det, "prod"),
      tax = child(det, "imposto"),
      icmsGroup = child(tax, "ICMS")?.children.find((n) => n.uri === info.uri);
    const itemNumber = Number(det.attributes.nItem);
    if (!Number.isInteger(itemNumber) || itemNumber < 1)
      throw new XmlImportError("Número de item inválido.");
    const path = `/NFe/infNFe/det[${index + 1}]/prod`;
    for (const name of ["NCM", "CFOP", "indTot"])
      if (!value(prod, name))
        warn(
          "MISSING_ITEM_FIELD",
          `Item ${itemNumber}: ${name} não informado.`,
          `${path}/${name}`,
        );
    return {
      item_number: itemNumber,
      code: value(prod, "cProd"),
      description: required(prod, "xProd"),
      gtin: value(prod, "cEAN"),
      ncm: value(prod, "NCM"),
      cest: value(prod, "CEST"),
      cfop: value(prod, "CFOP"),
      tax_situation: value(icmsGroup, "CSOSN") || value(icmsGroup, "CST"),
      quantity: decimal(value(prod, "qCom"), "qCom", 10),
      unit: value(prod, "uCom"),
      unit_value: decimal(value(prod, "vUnCom"), "vUnCom", 10),
      total_value: decimal(value(prod, "vProd"), "vProd"),
      discount_value: decimal(value(prod, "vDesc"), "vDesc", 2, true),
      taxes: plain(tax),
      data: plain(prod),
    };
  });
  if (items.length > 990) throw new XmlImportError("XML excede 990 itens.");
  if (!items.length) throw new XmlImportError("Nenhum item encontrado.");
  if (new Set(items.map((i) => i.item_number)).size !== items.length)
    throw new XmlImportError("Numeração de item repetida.");
  const product = decimal(value(icms, "vProd"), "ICMSTot/vProd"),
    discount = decimal(value(icms, "vDesc"), "ICMSTot/vDesc", 2, true);
  const included = children(info, "det").map((det) =>
    value(child(det, "prod"), "indTot"),
  );
  const taxGroups = children(info, "det").map((det) => child(det, "imposto"));
  const classified = taxGroups.every((t) =>
    Boolean(child(t, "ICMS") || child(t, "ISSQN")),
  );
  if (!classified)
    warn(
      "UNCLASSIFIED_ITEM_TAX",
      "Há item sem grupo ICMS/ISSQN; soma de produtos sujeitos ao ICMS não verificada.",
      "/NFe/infNFe/det/imposto",
    );
  if (classified && included.every((ind) => ind === "0" || ind === "1")) {
    const sum = items.reduce(
      (sum, item, index) =>
        included[index] === "1" && child(taxGroups[index], "ICMS")
          ? sum.plus(item.total_value)
          : sum,
      new D(0),
    );
    if (sum.minus(product).abs().gt("0.01"))
      warn(
        "PRODUCT_SUM",
        "vProd total difere da soma dos itens sujeitos ao ICMS com indTot=1.",
        "/NFe/infNFe/total/ICMSTot/vProd",
        "inconsistency",
        product,
        sum.toFixed(2),
      );
  }
  const discounts = items.reduce(
    (sum, item) => sum.plus(item.discount_value),
    new D(0),
  );
  if (discounts.minus(discount).abs().gt("0.01"))
    warn(
      "DISCOUNT_SUM",
      "Desconto total difere da soma dos descontos informados nos itens; revisar condições da operação.",
      "/NFe/infNFe/total/ICMSTot/vDesc",
      "warning",
      discount,
      discounts.toFixed(2),
    );
  const taxTotals: Record<string, string> = {};
  for (const tag of [
    "vICMS",
    "vST",
    "vIPI",
    "vPIS",
    "vCOFINS",
    "vFCP",
    "vFCPST",
  ])
    taxTotals[tag] = decimal(value(icms, tag), tag, 2, true);
  for (const tag of ["vIBS", "vCBS"]) {
    const values = leafValues(child(total, "IBSCBSTot"), tag);
    if (values.length === 1) taxTotals[tag] = decimal(values[0], tag);
    else if (values.length > 1)
      warn(
        "AMBIGUOUS_TAX",
        `Mais de um ${tag} no total; valor preservado no XML, sem agregação automática.`,
        `/NFe/infNFe/total/IBSCBSTot/${tag}`,
      );
  }
  const payment = child(info, "pag");
  if (children(payment, "detPag").length > 100)
    throw new XmlImportError("XML excede 100 pagamentos.");
  const payments = children(payment, "detPag").map((entry) => ({
    method: required(entry, "tPag"),
    value: decimal(value(entry, "vPag"), "vPag"),
    change_value: null,
    data: plain(entry),
  }));
  const totalValue = decimal(value(icms, "vNF"), "vNF");
  // This is only an arithmetic hint; specialized/reform groups deliberately skip it.
  if (
    !child(total, "ISSQNtot") &&
    !child(total, "IBSCBSTot") &&
    new D(decimal(value(icms, "vICMSDeson"), "vICMSDeson", 2, true)).isZero() &&
    value(ide, "finNFe") === "1" &&
    included.every((v) => v === "1")
  ) {
    let expected = new D(product).minus(discount);
    for (const tag of [
      "vST",
      "vFCPST",
      "vFrete",
      "vSeg",
      "vOutro",
      "vII",
      "vIPI",
      "vIPIDevol",
    ])
      expected = expected.plus(decimal(value(icms, tag), tag, 2, true));
    if (expected.minus(totalValue).abs().gt("0.01"))
      warn(
        "TOTAL_REVIEW",
        "vNF difere da composição aritmética básica. É um alerta para análise, não uma rejeição fiscal.",
        "/NFe/infNFe/total/ICMSTot/vNF",
        "warning",
        totalValue,
        expected.toFixed(2),
      );
  }
  return {
    access_key: key,
    environment: env,
    model,
    layout_version: info.attributes.versao,
    number: required(ide, "nNF"),
    series: required(ide, "serie"),
    issued_at: issued,
    authorized_at: authorized,
    operation_nature: value(ide, "natOp"),
    purpose: value(ide, "finNFe"),
    emission_type: value(ide, "tpEmis"),
    operation_type: value(ide, "tpNF"),
    issuer_tax_id: value(emit, "CNPJ") || required(emit, "CPF"),
    recipient_tax_id:
      value(dest, "CNPJ") || value(dest, "CPF") || value(dest, "idEstrangeiro"),
    recipient_name: value(dest, "xNome"),
    uf:
      value(child(dest, "enderDest"), "UF") ||
      value(child(emit, "enderEmit"), "UF"),
    issuer: plain(emit),
    recipient: plain(dest),
    total_value: totalValue,
    product_value: product,
    discount_value: discount,
    freight_value: decimal(value(icms, "vFrete"), "vFrete", 2, true),
    tax_totals: taxTotals,
    other_totals: plain(total),
    base_status: status,
    evidence,
    content_hash: createHash("sha256")
      .update(JSON.stringify(canonical(info)))
      .digest("hex"),
    issues,
    items,
    payments,
    data: {
      identification: plain(ide),
      payment: plain(payment),
      additional: plain(child(info, "infAdic")),
      technical: plain(child(info, "infRespTec")),
    },
  };
}
function parseEvent(root: XmlNode): FiscalEvent {
  const request =
    root.name === "evento"
      ? child(root, "infEvento")
      : child(child(root, "evento"), "infEvento");
  const returned =
    root.name === "retEvento"
      ? child(root, "infEvento")
      : child(child(root, "retEvento"), "infEvento");
  const info = returned || request;
  if (!info) throw new XmlImportError("Grupo infEvento ausente.");
  const key = accessKey(required(info, "chNFe")),
    env = environment(info),
    type = required(info, "tpEvento");
  const sequence = Number(required(info, "nSeqEvento"));
  if (
    !/^\d{6}$/.test(type) ||
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > 999
  )
    throw new XmlImportError("Tipo ou sequência do evento inválido.");
  if (
    request &&
    returned &&
    (value(request, "chNFe") !== key ||
      value(request, "tpAmb") !== env ||
      value(request, "tpEvento") !== type ||
      Number(value(request, "nSeqEvento")) !== sequence)
  )
    throw new XmlImportError(
      "Pedido e retorno do evento divergem em chave, ambiente, tipo ou sequência.",
    );
  const registered = timestamp(
      value(returned, "dhRegEvento"),
      "dhRegEvento",
      true,
    ),
    protocol = value(returned, "nProt"),
    code = value(returned, "cStat");
  return {
    access_key: key,
    environment: env,
    event_type: type,
    sequence,
    occurred_at: timestamp(value(request, "dhEvento"), "dhEvento", true),
    registered_at: registered,
    protocol,
    status_code: code,
    accepted: Boolean(
      returned &&
      registered &&
      protocol &&
      ["135", "155"].includes(code || "") &&
      validAccessKey(key),
    ),
    evidence: {
      request: plain(request),
      response: plain(returned),
      verification:
        "Evidência extraída do arquivo; assinatura e autenticidade não verificadas.",
    },
  };
}
export function parseFiscalXml(bytes: Uint8Array): ParsedFiscalFile {
  const root = parseXml(bytes);
  if (["NFe", "nfeProc"].includes(root.name))
    return { kind: "document", document: parseDocument(root) };
  if (["procEventoNFe", "evento", "retEvento"].includes(root.name))
    return { kind: "event", event: parseEvent(root) };
  throw new XmlImportError(
    `Mensagem ${root.name} não suportada. Importe NFe, nfeProc ou um evento individual (procEventoNFe, evento, retEvento).`,
    "UNSUPPORTED_MESSAGE",
  );
}
