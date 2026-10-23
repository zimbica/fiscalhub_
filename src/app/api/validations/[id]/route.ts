import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin, ApiError, success, failure } from "@/lib/api";
import { getValidation } from "@/services/validations";
import { rateLimit } from "@/services/rate-limit";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError(400, "Validação inválida.");
    const saved = await getValidation(supabase, user.id, id);
    const format = new URL(request.url).searchParams.get("format");
    if (format === "xml") {
      if (!saved.original_path)
        throw new ApiError(404, "Original não disponível.");
      const file = await supabase.storage
        .from("fiscal-xml")
        .download(saved.original_path);
      if (file.error) throw new ApiError(404, "Original não disponível.");
      return new Response(file.data, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="validacao-${id}.xml"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (format === "json")
      return new Response(JSON.stringify(saved.report, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="validacao-${id}.json"`,
          "Cache-Control": "private, no-store",
        },
      });
    return success(saved.report);
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, "validation-delete", 60, 60, user.id);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError(400, "Validação inválida.");
    const saved = await getValidation(supabase, user.id, id);
    if (saved.original_path) {
      const removed = await supabase.storage
        .from("fiscal-xml")
        .remove([saved.original_path]);
      if (removed.error)
        throw new ApiError(
          503,
          "Falha na exclusão do original. Tente novamente.",
        );
    }
    const deleted = await supabase
      .from("xml_validations")
      .delete()
      .eq("user_id", user.id)
      .eq("id", id);
    if (deleted.error) throw deleted.error;
    return success({ message: "Validação excluída." });
  } catch (error) {
    return failure(error);
  }
}
