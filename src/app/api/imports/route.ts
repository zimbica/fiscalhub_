import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { assertSameOrigin, readBody, success, failure } from "@/lib/api";
import { rateLimit } from "@/services/rate-limit";
import { listImports } from "@/services/documents";
export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const page = Math.max(
      1,
      Math.min(
        10000,
        parseInt(new URL(request.url).searchParams.get("page") || "1") || 1,
      ),
    );
    return success(await listImports(supabase, user.id, page));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await requireUser();
    await rateLimit(request, "import-create", 30, 3600, user.id);
    const body = await readBody(
      request,
      z.object({ name: z.string().trim().min(1).max(160) }),
    );
    const { data, error } = await supabase
      .from("xml_imports")
      .insert({ user_id: user.id, name: body.name })
      .select()
      .single();
    if (error) throw error;
    return success(data, 201);
  } catch (error) {
    return failure(error);
  }
}
