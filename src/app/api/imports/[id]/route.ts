import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  ApiError,
  assertSameOrigin,
  readBody,
  success,
  failure,
} from "@/lib/api";
import { deleteFilesChunk } from "@/services/documents";
import { rateLimit } from "@/services/rate-limit";
type Context = { params: Promise<{ id: string }> };
async function identify(context: Context) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    throw new ApiError(400, "Lote inválido.");
  return id;
}
export async function GET(request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    const id = await identify(context);
    const page = Math.max(
      1,
      parseInt(new URL(request.url).searchParams.get("page") || "1") || 1,
    );
    const job = await supabase
      .from("xml_imports")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (job.error) throw job.error;
    if (!job.data) throw new ApiError(404, "Lote não encontrado.");
    const files = await supabase
      .from("import_files")
      .select(
        "id,filename,outcome,message,document_id,original_path,created_at",
        { count: "exact" },
      )
      .eq("import_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 25, page * 25 - 1);
    if (files.error) throw files.error;
    return success({
      job: job.data,
      files: files.data,
      total: files.count,
      page,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    const id = await identify(context);
    const body = await readBody(
      request,
      z.object({
        status: z.enum(["processing", "completed", "interrupted"]),
        total: z.number().int().min(0).max(10000).optional(),
      }),
    );
    const counted =
      body.status === "completed"
        ? await supabase
            .from("import_files")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("import_id", id)
        : null;
    if (counted?.error) throw counted.error;
    const { data, error } = await supabase
      .from("xml_imports")
      .update({
        status: body.status,
        ...(counted ? { total_files: counted.count || 0 } : {}),
      })
      .eq("user_id", user.id)
      .eq("id", id)
      .neq("status", "deleting")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "Lote indisponível.");
    return success(data);
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, "import-delete", 120, 60, user.id);
    return success(
      await deleteFilesChunk(
        supabase,
        user.id,
        await identify(context),
        "import",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
