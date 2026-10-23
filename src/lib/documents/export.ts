import type { DocumentRow } from "@/types/document-report";
import { statusLabels } from "./filters";
export const exportHeadings = [
  "Chave",
  "Modelo",
  "Ambiente",
  "Número",
  "Série",
  "Emissão",
  "Autorização",
  "Emitente",
  "Destinatário",
  "Nome destinatário",
  "Situação identificada",
  "Total (R$)",
  "Produtos (R$)",
  "Desconto (R$)",
  "Frete (R$)",
  "UF",
  "Finalidade",
  "Alertas",
];
export function exportRows(rows: DocumentRow[]) {
  return rows.map((r) => [
    r.access_key,
    r.model,
    r.environment,
    r.number,
    r.series,
    r.issued_at,
    r.authorized_at || "",
    r.issuer_tax_id,
    r.recipient_tax_id || "",
    r.recipient_name || "",
    statusLabels[r.status],
    r.total_value,
    r.product_value,
    r.discount_value,
    r.freight_value,
    r.uf || "",
    r.purpose || "",
    String(r.issue_count),
  ]);
}
export function csvCell(value: string) {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvDocuments(rows: DocumentRow[]) {
  return (
    "\ufeff" +
    [exportHeadings, ...exportRows(rows)]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n")
  );
}
