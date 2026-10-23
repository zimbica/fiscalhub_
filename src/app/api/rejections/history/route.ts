import { requireUser } from "@/lib/auth/session";
import { success, failure, assertSameOrigin } from "@/lib/api";
import { rejectionHistory } from "@/services/rejections";
import { rateLimit } from "@/services/rate-limit";
export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    return success(await rejectionHistory(supabase, user.id));
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, "rejection-history-delete", 10, 60, user.id);
    const r = await supabase
      .from("search_history")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", "rejection");
    if (r.error) throw r.error;
    return success({ message: "Histórico de pesquisas excluído." });
  } catch (e) {
    return failure(e);
  }
}
