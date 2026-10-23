import type { Database } from "./database";
export type RejectionRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  models: string[];
  reviewed_at: string;
  revision: string;
  aliases: string[];
  favorite: boolean;
  match_kind: "code" | "exact" | "text" | "approximate" | "browse";
};
export type RejectionSearch = {
  items: RejectionRow[];
  total: number;
  page: number;
  catalogSize: number;
  reviewedAt: string | null;
  identification:
    "code" | "exact" | "none" | "ambiguous" | "suggestions" | "browse";
  identifiedCode: string | null;
};
export type RejectionDetail =
  Database["public"]["Tables"]["rejection_catalog"]["Row"] & {
    rejection_sources: Database["public"]["Tables"]["rejection_sources"]["Row"][];
    favorite: boolean;
    related: { code: string; title: string }[];
  };
export type RejectionHistory = Pick<
  Database["public"]["Tables"]["search_history"]["Row"],
  "id" | "query" | "created_at" | "result_id"
>[];
