import { requireUser } from "@/lib/auth/session";
import { success, failure, readBody, assertSameOrigin } from "@/lib/api";
import { searchInput } from "@/lib/rejections/query";
import { searchRejections } from "@/services/rejections";
import { rateLimit } from "@/services/rate-limit";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, "rejection-search", 60, 60, user.id);
    const input = await readBody(request, searchInput);
    return success(await searchRejections(supabase, user.id, input, true));
  } catch (e) {
    return failure(e);
  }
}
export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    return success(
      await searchRejections(supabase, user.id, searchInput.parse({})),
    );
  } catch (e) {
    return failure(e);
  }
}
