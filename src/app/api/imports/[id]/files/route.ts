import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ApiError, assertSameOrigin, success, failure } from "@/lib/api";
import { rateLimit } from "@/services/rate-limit";
import { importXml, readXmlBody } from "@/services/documents";
export const runtime = "nodejs";
export const maxDuration = 60;
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
    const name = new URL(request.url).searchParams.get("name") || "";
    if (
      !name ||
      name.length > 240 ||
      Array.from(name).some((c) => c.charCodeAt(0) < 32) ||
      !name.toLowerCase().endsWith(".xml")
    )
      throw new ApiError(400, "Nome de XML inválido.");
    await rateLimit(request, "xml-upload", 600, 60, user.id);
    await rateLimit(request, "xml-upload-daily", 10000, 86400, user.id);
    return success(
      await importXml(supabase, user.id, id, name, await readXmlBody(request)),
    );
  } catch (error) {
    return failure(error);
  }
}
