import { z } from "zod";
import { createHash } from "node:crypto";
import { requireUser } from "@/lib/auth/session";
import {
  ApiError,
  assertSameOrigin,
  readBody,
  success,
  failure,
} from "@/lib/api";
import { rateLimit } from "@/services/rate-limit";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError(400, "Lote inválido.");
    await rateLimit(request, "import-rejected", 600, 60, user.id);
    const { name, message } = await readBody(
      request,
      z.object({
        name: z.string().min(1).max(240),
        message: z.string().min(1).max(500),
      }),
    );
    const { data, error } = await supabase.rpc("save_import_file", {
      p_import_id: id,
      p_filename: name,
      p_sha256: createHash("sha256")
        .update(`rejected:${name}:${message}`)
        .digest("hex"),
      p_payload: {},
      p_error: message,
    });
    if (error) throw error;
    return success(data);
  } catch (error) {
    return failure(error);
  }
}
