import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { DocumentReport, DocumentDetail } from "@/types/document-report";
import type { ImportFileResult } from "@/types/fiscal";
import type { DocumentFilters } from "@/lib/documents/filters";
import { ApiError } from "@/lib/api";
import { parseFiscalXml } from "./xml/parser";
import { MAX_XML_BYTES, XmlImportError } from "./xml/tree";
type Client = SupabaseClient<Database>;
export async function readXmlBody(request: Request) {
  if (
    !/^(application\/xml|text\/xml|application\/octet-stream)(;|$)/i.test(
      request.headers.get("content-type") || "",
    )
  )
    throw new ApiError(415, "Envie um arquivo XML.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Arquivo vazio.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_XML_BYTES) {
      await reader.cancel();
      throw new ApiError(413, "Cada XML pode ter até 2 MiB.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function importXml(
  client: Client,
  userId: string,
  importId: string,
  filename: string,
  bytes: Uint8Array,
): Promise<ImportFileResult> {
  const sha = createHash("sha256").update(bytes).digest("hex");
  const job = await client
    .from("xml_imports")
    .select("id,status")
    .eq("user_id", userId)
    .eq("id", importId)
    .maybeSingle();
  if (job.error) throw job.error;
  if (!job.data || job.data.status === "deleting")
    throw new ApiError(404, "Lote indisponível.");
  const existing = await client
    .from("import_files")
    .select("id,outcome,message,document_id,original_path")
    .eq("user_id", userId)
    .eq("import_id", importId)
    .eq("sha256", sha)
    .eq("filename", filename)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data)
    return {
      id: existing.data.id,
      outcome: existing.data.outcome as ImportFileResult["outcome"],
      message: existing.data.message,
      documentId: existing.data.document_id,
      path: existing.data.original_path,
      replayed: true,
    };
  let payload: Json = {};
  let errorMessage: string | undefined;
  try {
    payload = parseFiscalXml(bytes) as unknown as Json;
  } catch (error) {
    if (error instanceof XmlImportError) errorMessage = error.message;
    else throw error;
  }
  let path: string | undefined;
  if (!errorMessage) {
    path = `${userId}/${importId}/${randomUUID()}.xml`;
    const upload = await client.storage
      .from("fiscal-xml")
      .upload(path, bytes, { contentType: "application/xml", upsert: false });
    if (upload.error)
      throw new ApiError(
        503,
        "Não foi possível armazenar o XML. Confira o espaço disponível e tente retomar o lote.",
      );
  }
  const saved = await client.rpc("save_import_file", {
    p_import_id: importId,
    p_sha256: sha,
    p_filename: filename,
    p_payload: payload,
    ...(path ? { p_path: path } : {}),
    ...(errorMessage ? { p_error: errorMessage } : {}),
  });
  if (saved.error) {
    if (path) await client.storage.from("fiscal-xml").remove([path]);
    throw saved.error;
  }
  const result = saved.data as unknown as ImportFileResult;
  if (path && result.path !== path)
    await client.storage.from("fiscal-xml").remove([path]);
  return result;
}
export async function listImports(client: Client, userId: string, page = 1) {
  const { data, error, count } = await client
    .from("xml_imports")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 10, page * 10 - 1);
  if (error) throw error;
  return { items: data, total: count || 0, page };
}
export async function reportDocuments(
  client: Client,
  filters: DocumentFilters,
  exporting = false,
): Promise<DocumentReport> {
  const { data, error } = await client.rpc("document_report", {
    p_filters: filters,
    p_page: filters.page,
    p_export: exporting,
  });
  if (error) throw error;
  return data as unknown as DocumentReport;
}
export async function getDocument(client: Client, userId: string, id: string) {
  const { data, error } = await client.rpc("document_details", { p_id: id });
  if (error) throw error;
  if (!data) throw new ApiError(404, "Documento não encontrado.");
  return data as unknown as DocumentDetail;
}
// Storage and Postgres do not share a transaction. Removal is bounded, resumable and
// leaves metadata in place on a storage failure so that retry can finish cleanup.
export async function deleteFilesChunk(
  client: Client,
  userId: string,
  id: string,
  kind: "import" | "document",
) {
  const table = kind === "import" ? "xml_imports" : "fiscal_documents";
  const marked =
    kind === "import"
      ? await client
          .from("xml_imports")
          .update({ status: "deleting" })
          .eq("user_id", userId)
          .eq("id", id)
          .select("id")
          .maybeSingle()
      : await client
          .from("fiscal_documents")
          .update({ deleting: true })
          .eq("user_id", userId)
          .eq("id", id)
          .select("id")
          .maybeSingle();
  if (marked.error) throw marked.error;
  if (!marked.data) return { done: true, remaining: 0 };
  let eventIds: string[] = [];
  if (kind === "document") {
    const document = await client
      .from("fiscal_documents")
      .select("access_key,environment")
      .eq("user_id", userId)
      .eq("id", id)
      .single();
    if (document.error) throw document.error;
    const events = await client
      .from("fiscal_events")
      .select("id")
      .eq("user_id", userId)
      .eq("access_key", document.data.access_key)
      .eq("environment", document.data.environment)
      .limit(1000);
    if (events.error) throw events.error;
    eventIds = events.data.map((e) => e.id);
  }
  const selectFiles = () => {
    const query = client
      .from("import_files")
      .select("id,original_path", { count: "exact" })
      .eq("user_id", userId);
    return kind === "import"
      ? query.eq("import_id", id)
      : eventIds.length
        ? query.or(`document_id.eq.${id},event_id.in.(${eventIds.join(",")})`)
        : query.eq("document_id", id);
  };
  const files = await selectFiles().order("id").limit(50);
  if (files.error) throw files.error;
  const paths = files.data
    .map((f) => f.original_path)
    .filter((p): p is string => Boolean(p));
  if (paths.length) {
    const removed = await client.storage.from("fiscal-xml").remove(paths);
    if (removed.error)
      throw new ApiError(
        503,
        "Exclusão pausada no armazenamento. Tente novamente para concluir.",
      );
  }
  if (files.data.length) {
    const deleted = await client
      .from("import_files")
      .delete()
      .eq("user_id", userId)
      .in(
        "id",
        files.data.map((f) => f.id),
      );
    if (deleted.error) throw deleted.error;
  }
  const remaining = await selectFiles().limit(1);
  if (remaining.error) throw remaining.error;
  if (!remaining.count) {
    const deleted = await client
      .from(table)
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (deleted.error) throw deleted.error;
  }
  return { done: !remaining.count, remaining: remaining.count || 0 };
}
