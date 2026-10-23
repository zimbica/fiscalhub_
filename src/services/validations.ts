import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { ValidationReport } from "@/types/validation";
import { validateFiscalXml } from "@/validators/validate";
import { ApiError } from "@/lib/api";
type Client = SupabaseClient<Database>;
let activeValidations = 0;
export async function createValidation(
  client: Client,
  userId: string,
  bytes: Uint8Array,
  filename: string,
  documentId?: string,
) {
  if (activeValidations >= 2)
    throw new ApiError(503, "Validador ocupado. Aguarde e tente novamente.");
  activeValidations++;
  let report: ValidationReport;
  try {
    report = await validateFiscalXml(bytes, filename);
  } catch {
    throw new ApiError(
      503,
      "Não foi possível concluir o motor XSD. Nenhum resultado foi marcado como válido; tente novamente.",
    );
  } finally {
    activeValidations--;
  }
  const id = randomUUID(),
    path = `${userId}/validations/${id}.xml`;
  report.id = id;
  const upload = await client.storage
    .from("fiscal-xml")
    .upload(path, bytes, { contentType: "application/xml", upsert: false });
  if (upload.error)
    throw new ApiError(
      503,
      "Não foi possível salvar o original da validação. Confira a cota de armazenamento.",
    );
  const saved = await client.rpc("save_xml_validation", {
    p_id: id,
    p_report: report as unknown as Json,
    p_path: path,
    ...(documentId ? { p_document_id: documentId } : {}),
  });
  if (saved.error) {
    await client.storage.from("fiscal-xml").remove([path]);
    throw saved.error;
  }
  return report;
}
export async function listValidations(
  client: Client,
  userId: string,
  page = 1,
) {
  const r = await client
    .from("xml_validations")
    .select(
      "id,filename,document_type,layout_version,structural_result,xsd_result,rules_result,error_count,warning_count,created_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (r.error) throw r.error;
  return { items: r.data, total: r.count || 0, page };
}
export async function getValidation(
  client: Client,
  userId: string,
  id: string,
) {
  const r = await client
    .from("xml_validations")
    .select("report,original_path")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw new ApiError(404, "Validação não encontrada.");
  return r.data;
}
