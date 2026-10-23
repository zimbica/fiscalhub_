import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ApiError, assertSameOrigin, success, failure } from "@/lib/api";
import { getDocument, deleteFilesChunk } from "@/services/documents";
import { rateLimit } from "@/services/rate-limit";
type Context = { params: Promise<{ id: string }> };
async function identify(context: Context) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    throw new ApiError(400, "Documento inválido.");
  return id;
}
export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    return success(
      await getDocument(supabase, user.id, await identify(context)),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, "document-delete", 120, 60, user.id);
    return success(
      await deleteFilesChunk(
        supabase,
        user.id,
        await identify(context),
        "document",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
