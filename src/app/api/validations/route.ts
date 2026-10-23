import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin, ApiError, success, failure } from "@/lib/api";
import { rateLimit } from "@/services/rate-limit";
import { readXmlBody } from "@/services/documents";
import { createValidation, listValidations } from "@/services/validations";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, "xml-validation", 20, 60, user.id);
    await rateLimit(request, "xml-validation-daily", 500, 86400, user.id);
    const params = new URL(request.url).searchParams;
    const filename = params.get("name") || "documento.xml";
    const source = params.get("source");
    if (
      filename.length > 240 ||
      Array.from(filename).some((c) => c.charCodeAt(0) < 32)
    )
      throw new ApiError(400, "Nome de arquivo inválido.");
    let bytes: Uint8Array, documentId: string | undefined;
    if (source) {
      if (!z.uuid().safeParse(source).success)
        throw new ApiError(400, "Original inválido.");
      const file = await supabase
        .from("import_files")
        .select("original_path,document_id")
        .eq("user_id", user.id)
        .eq("id", source)
        .maybeSingle();
      if (file.error) throw file.error;
      if (!file.data?.original_path)
        throw new ApiError(404, "Original não encontrado.");
      const original = await supabase.storage
        .from("fiscal-xml")
        .download(file.data.original_path);
      if (original.error) throw new ApiError(404, "Original indisponível.");
      bytes = new Uint8Array(await original.data.arrayBuffer());
      documentId = file.data.document_id || undefined;
    } else bytes = await readXmlBody(request);
    return success(
      await createValidation(supabase, user.id, bytes, filename, documentId),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const p = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .safeParse(new URL(request.url).searchParams.get("page") || 1);
    if (!p.success) throw new ApiError(400, "Página inválida.");
    return success(await listValidations(supabase, user.id, p.data));
  } catch (error) {
    return failure(error);
  }
}
