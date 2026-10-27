import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDashboard, activityNames } from "@/services/workspace";
import { dateTime, money } from "@/lib/format";
import { modules } from "@/lib/navigation";
export const metadata = { title: "Visão geral" };
export default async function Dashboard() {
  const { summary, events } = await getDashboard();
  const metrics = [
    ["Documentos importados", String(summary.documents)],
    ["Valor dos documentos", money(summary.totalValue)],
    ["Validações realizadas", String(summary.validations)],
    ["Empresas consultadas", String(summary.companies)],
  ];
  const destinations: Record<number, string> = {
    2: "/consulta-cnpj",
    3: "/documentos",
    4: "/validador",
    5: "/rejeicoes",
  };
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1>Visão geral</h1>
        <Button asChild>
          <Link href="/documentos">Importar XML</Link>
        </Button>
      </header>
      <section
        aria-label="Indicadores da sua conta"
        className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card xl:grid-cols-4"
      >
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="border-b border-r border-border p-4 last:border-r-0 xl:border-b-0"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-3 break-words text-xl font-semibold tracking-tight tabular-nums sm:text-xl">
              {value}
            </p>
          </div>
        ))}
      </section>
      <section
        aria-label="Ferramentas"
        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
      >
        {modules.map(({ title, stage, icon: Icon }) => (
          <Link
            key={title}
            href={destinations[stage] || "/projeto"}
            className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-xs font-medium transition-colors hover:border-primary/60 hover:bg-accent"
          >
            <Icon className="size-4 text-primary-text" />
            <span>{title}</span>
            <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground" />
          </Link>
        ))}
      </section>
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-medium">Atividade recente</h2>
          <Link
            href="/historico"
            className="text-xs text-primary-text hover:underline"
          >
            Ver histórico
          </Link>
        </div>
        {events.length ? (
          <div
            tabIndex={0}
            role="region"
            aria-label="Tabela com rolagem horizontal"
            className="overflow-x-auto"
          >
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Atividade</th>
                  <th>Data e hora</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{activityNames[event.action] || event.action}</td>
                    <td className="whitespace-nowrap text-muted-foreground">
                      {dateTime(event.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhuma atividade registrada.
          </p>
        )}
      </section>
    </div>
  );
}
