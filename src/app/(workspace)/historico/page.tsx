import Link from "next/link";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/auth/session";
import { dateTime } from "@/lib/format";
import { activityNames } from "@/services/workspace";
export const metadata = { title: "Histórico de atividade" };
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.pagina || "1") || 1),
  );
  const filter =
    params.tipo && Object.hasOwn(activityNames, params.tipo) ? params.tipo : "";
  const { supabase } = await requirePageUser();
  let query = supabase
    .from("activity_events")
    .select("id,action,created_at", { count: "exact" });
  if (filter) query = query.eq("action", filter);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 15, page * 15 - 1);
  if (error) throw new Error("Não foi possível carregar seu histórico.");
  const totalPages = Math.max(1, Math.ceil((count || 0) / 15));
  const pageUrl = (value: number) =>
    `/historico?pagina=${value}${filter ? `&tipo=${filter}` : ""}`;
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">
        Histórico de atividade
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Alterações e ações registradas na sua conta. Horários de Brasília.
      </p>
      <div className="mt-7 rounded-md border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="size-4 text-primary-text" />
            {count || 0} registro(s)
          </div>
          <form className="flex flex-wrap items-center gap-2">
            <label htmlFor="tipo" className="text-xs text-muted-foreground">
              Tipo de atividade
            </label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={filter}
              className="h-9 rounded-lg border bg-background px-3 text-xs"
            >
              <option value="">Todas</option>
              {Object.entries(activityNames).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>
        </div>
        {data.length ? (
          <div
            tabIndex={0}
            role="region"
            aria-label="Tabela com rolagem horizontal"
            className="overflow-x-auto"
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Atividade</th>
                  <th className="px-6 py-4 font-medium">Data e hora</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/30">
                    <td className="px-6 py-5">
                      {activityNames[event.action] || event.action}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-muted-foreground">
                      {dateTime(event.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-14 text-center">
            <History className="mx-auto size-8 text-muted-foreground/40" />
            <h2 className="mt-4 text-sm font-semibold">
              Nenhuma atividade encontrada
            </h2>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t p-4 text-xs text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline">
                <Link href={pageUrl(page - 1)}>
                  <ChevronLeft /> Anterior
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline">
                <Link href={pageUrl(page + 1)}>
                  Próxima <ChevronRight />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
