export type FiscalIssue = {
  code: string;
  severity: "warning" | "inconsistency";
  message: string;
  path: string;
  source: string;
  found?: string;
  expected?: string;
};
export type FiscalItem = {
  item_number: number;
  code: string | null;
  description: string;
  gtin: string | null;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  tax_situation: string | null;
  quantity: string;
  unit: string | null;
  unit_value: string;
  total_value: string;
  discount_value: string;
  taxes: unknown;
  data: unknown;
};
export type FiscalPayment = {
  method: string;
  value: string;
  change_value: null;
  data: unknown;
};
export type FiscalDocument = {
  access_key: string;
  environment: "1" | "2";
  model: "55" | "65";
  layout_version: string;
  number: string;
  series: string;
  issued_at: string;
  authorized_at: string | null;
  operation_nature: string | null;
  purpose: string | null;
  emission_type: string | null;
  operation_type: string | null;
  issuer_tax_id: string;
  recipient_tax_id: string | null;
  recipient_name: string | null;
  uf: string | null;
  issuer: unknown;
  recipient: unknown;
  total_value: string;
  product_value: string;
  discount_value: string;
  freight_value: string;
  tax_totals: Record<string, string>;
  other_totals: unknown;
  base_status: "unconfirmed" | "authorized" | "denied";
  evidence: unknown;
  content_hash: string;
  issues: FiscalIssue[];
  items: FiscalItem[];
  payments: FiscalPayment[];
  data: unknown;
};
export type FiscalEvent = {
  access_key: string;
  environment: "1" | "2";
  event_type: string;
  sequence: number;
  occurred_at: string | null;
  registered_at: string | null;
  protocol: string | null;
  status_code: string | null;
  accepted: boolean;
  evidence: unknown;
};
export type ParsedFiscalFile =
  | { kind: "document"; document: FiscalDocument }
  | { kind: "event"; event: FiscalEvent };
export type ImportFileResult = {
  id: string;
  outcome: "imported" | "duplicate" | "updated" | "conflict" | "invalid";
  message: string | null;
  documentId: string | null;
  path: string | null;
  replayed?: boolean;
};
