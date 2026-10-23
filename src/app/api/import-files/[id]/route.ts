import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ApiError, failure } from "@/lib/api";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError(400, "Arquivo inválido.");
    const result = await supabase
      .from("import_files")
      .select("original_path")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data?.original_path)
      throw new ApiError(404, "Original não encontrado.");
    const file = await supabase.storage
      .from("fiscal-xml")
      .download(result.data.original_path);
    if (file.error) throw new ApiError(404, "Original não disponível.");
    return new Response(file.data, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="fiscalhub-${id}.xml"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
