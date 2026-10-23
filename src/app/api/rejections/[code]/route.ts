import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  success,
  failure,
  ApiError,
  readBody,
  assertSameOrigin,
} from "@/lib/api";
import { rejectionDetail } from "@/services/rejections";
import { rateLimit } from "@/services/rate-limit";
type Context = { params: Promise<{ code: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, user } = await requireUser();
    const { code } = await context.params;
    if (!/^\d{3,4}$/.test(code)) throw new ApiError(400, "Código inválido.");
    return success(await rejectionDetail(supabase, user.id, code));
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, "rejection-favorite", 60, 60, user.id);
    const { code } = await context.params;
    if (!/^\d{3,4}$/.test(code)) throw new ApiError(400, "Código inválido.");
    const { favorite } = await readBody(
      request,
      z.object({ favorite: z.boolean() }),
    );
    const detail = await rejectionDetail(supabase, user.id, code);
    const r = favorite
      ? await supabase
          .from("rejection_favorites")
          .upsert(
            { user_id: user.id, rejection_id: detail.id },
            { onConflict: "user_id,rejection_id", ignoreDuplicates: true },
          )
      : await supabase
          .from("rejection_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("rejection_id", detail.id);
    if (r.error) throw r.error;
    return success({ favorite });
  } catch (e) {
    return failure(e);
  }
}
