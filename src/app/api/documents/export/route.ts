import writeXlsxFile from "write-excel-file/node";
import { requireUser } from "@/lib/auth/session";
import { ApiError, failure } from "@/lib/api";
import { documentFiltersSchema } from "@/lib/documents/filters";
import {
  csvDocuments,
  exportRows,
  exportHeadings,
} from "@/lib/documents/export";
import { reportDocuments } from "@/services/documents";
import { rateLimit } from "@/services/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    await rateLimit(request, "document-export", 10, 60, user.id);
    const params = new URL(request.url).searchParams;
    const parsed = documentFiltersSchema.safeParse(Object.fromEntries(params));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    const report = await reportDocuments(supabase, parsed.data, true);
    if (report.total > 5000)
      throw new ApiError(
        422,
        "A exportação aceita até 5.000 documentos. Restrinja os filtros e tente novamente.",
      );
    const format = params.get("format") || "csv";
    if (!["csv", "xlsx"].includes(format))
      throw new ApiError(400, "Formato inválido.");
    const headers = {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="fiscalhub-documentos.${format}"`,
    };
    if (format === "csv")
      return new Response(csvDocuments(report.rows), {
        headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
      });
    const blob = await writeXlsxFile(
      [exportHeadings, ...exportRows(report.rows)].map((row) =>
        row.map((value) => ({ type: String, value })),
      ),
      { sheet: "Documentos" },
    ).toBuffer();
    return new Response(new Uint8Array(blob), {
      headers: {
        ...headers,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
