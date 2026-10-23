import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { RejectionSearch, RejectionDetail } from "@/types/rejections";
import {
  extractCode,
  historyLabel,
  normalizeMessage,
  type SearchInput,
} from "@/lib/rejections/query";
import { ApiError } from "@/lib/api";
type Client = SupabaseClient<Database>;
export async function searchRejections(
  client: Client,
  userId: string,
  input: SearchInput,
  record = false,
): Promise<RejectionSearch> {
  const extracted = extractCode(input.query);
  const { data, error } = await client.rpc("search_rejections", {
    p_query: extracted.ambiguous ? "" : input.query,
    p_code: extracted.code ?? undefined,
    p_model: input.model ?? undefined,
    p_favorites: input.favorites,
    p_page: input.page,
  });
  if (error) throw error;
  const result = data as unknown as RejectionSearch;
  result.identification = extracted.ambiguous
    ? "ambiguous"
    : !input.query
      ? "browse"
      : result.items.length
        ? "suggestions"
        : "none";
  result.identifiedCode = null;
  if (extracted.ambiguous) {
    result.items = [];
    result.total = 0;
  }
  if (!extracted.ambiguous && result.items.length) {
    if (extracted.code) {
      result.identification = "code";
      result.identifiedCode = extracted.code;
    } else {
      const exact = result.items.filter((r) =>
        [r.title, ...r.aliases].some(
          (t) => normalizeMessage(t) === normalizeMessage(input.query),
        ),
      );
      if (exact.length === 1) {
        result.identification = "exact";
        result.identifiedCode = exact[0].code;
      }
    }
  }
  if (record && input.query && input.page === 1) {
    const saved = await client.from("search_history").insert({
      user_id: userId,
      query: historyLabel(input, result.identifiedCode),
      kind: "rejection",
      result_id:
        result.items.find((i) => i.code === result.identifiedCode)?.id ?? null,
    });
    if (saved.error) throw saved.error;
  }
  return result;
}
export async function rejectionHistory(client: Client, userId: string) {
  const r = await client
    .from("search_history")
    .select("id,query,created_at,result_id")
    .eq("user_id", userId)
    .eq("kind", "rejection")
    .order("created_at", { ascending: false })
    .order("id")
    .limit(20);
  if (r.error) throw r.error;
  return r.data;
}
export async function rejectionDetail(
  client: Client,
  userId: string,
  code: string,
): Promise<RejectionDetail> {
  const r = await client
    .from("rejection_catalog")
    .select("*,rejection_sources(*)")
    .eq("code", code)
    .maybeSingle();
  if (r.error) throw r.error;
  if (!r.data)
    throw new ApiError(404, "Rejeição ainda não cadastrada nesta base.");
  const [favorites, related] = await Promise.all([
    client
      .from("rejection_favorites")
      .select("rejection_id")
      .eq("user_id", userId)
      .eq("rejection_id", r.data.id),
    client
      .from("rejection_catalog")
      .select("code,title")
      .in("code", r.data.related_codes),
  ]);
  if (favorites.error) throw favorites.error;
  if (related.error) throw related.error;
  return {
    ...r.data,
    favorite: !!favorites.data.length,
    related: related.data,
  };
}
