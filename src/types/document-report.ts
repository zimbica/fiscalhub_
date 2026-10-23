export type DocumentRow = {
  id: string;
  access_key: string;
  number: string;
  series: string;
  model: string;
  environment: string;
  issued_at: string;
  authorized_at: string | null;
  issuer_tax_id: string;
  recipient_tax_id: string | null;
  recipient_name: string | null;
  status: "unconfirmed" | "authorized" | "cancelled" | "denied";
  total_value: string;
  product_value: string;
  discount_value: string;
  freight_value: string;
  uf: string | null;
  purpose: string | null;
  issue_count: number;
};
export type ChartPoint = { label: string; value: string; count?: number };
export type DocumentReport = {
  rows: DocumentRow[];
  total: number;
  page: number;
  pageSize: number;
  metrics: {
    count: number;
    total: string;
    nfe: string;
    nfce: string;
    products: string;
    discount: string;
    freight: string;
    average: string;
    taxes: string;
    quantity: string;
    quantitiesByUnit: { unit: string; quantity: string }[];
    items: number;
    authorized: number;
    cancelled: number;
    unconfirmed: number;
    review: number;
  };
  charts: Record<
    | "daily"
    | "monthly"
    | "models"
    | "payments"
    | "products"
    | "quantities"
    | "cfops"
    | "states"
    | "taxes",
    ChartPoint[]
  >;
};
export type DocumentDetail = {
  document: Omit<
    import("@/types/database").Database["public"]["Tables"]["fiscal_documents"]["Row"],
    "total_value" | "product_value" | "discount_value" | "freight_value"
  > & {
    total_value: string;
    product_value: string;
    discount_value: string;
    freight_value: string;
  };
  items: (Omit<
    import("@/types/database").Database["public"]["Tables"]["fiscal_items"]["Row"],
    "quantity" | "unit_value" | "total_value" | "discount_value"
  > & {
    quantity: string;
    unit_value: string;
    total_value: string;
    discount_value: string;
  })[];
  payments: (Omit<
    import("@/types/database").Database["public"]["Tables"]["fiscal_payments"]["Row"],
    "value" | "change_value"
  > & { value: string; change_value: string | null })[];
  events: import("@/types/database").Database["public"]["Tables"]["fiscal_events"]["Row"][];
  files: {
    id: string;
    filename: string;
    outcome: string;
    created_at: string;
    original_path: string | null;
  }[];
};
