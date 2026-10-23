import { requireUser } from "@/lib/auth/session";
import { success, failure, ApiError } from "@/lib/api";
import { documentFiltersSchema } from "@/lib/documents/filters";
import { reportDocuments } from "@/services/documents";
import { rateLimit } from "@/services/rate-limit";
export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    await rateLimit(request, "document-report", 60, 60, user.id);
    const parsed = documentFiltersSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    return success(await reportDocuments(supabase, parsed.data));
  } catch (error) {
    return failure(error);
  }
}
