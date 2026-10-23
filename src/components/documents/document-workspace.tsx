"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Download,
  Files,
  ArrowUpRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImportPanel } from "./import-panel";
import { DocumentFilterForm } from "./document-filters";
import { apiRequest } from "@/lib/http-client";
import { money, dateTime } from "@/lib/format";
import {
  documentFiltersSchema,
  emptyFilters,
  statusLabels,
  type DocumentFilters,
} from "@/lib/documents/filters";
import type { DocumentReport } from "@/types/document-report";
import type { Database } from "@/types/database";
const Charts = dynamic(
  () => import("./document-charts").then((m) => m.DocumentCharts),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-muted-foreground">
        Carregando gráficos...
      </p>
    ),
  },
);
function query(filters: DocumentFilters) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, String(value)]),
    ),
  ).toString();
}
export function DocumentWorkspace({
  initialReport,
  initialImports,
}: {
  initialReport: DocumentReport;
  initialImports: {
    items: Database["public"]["Tables"]["xml_imports"]["Row"][];
    page: number;
    total: number;
  };
}) {
  const [report, setReport] = useState(initialReport),
    [filters, setFilters] = useState(emptyFilters),
    [applied, setApplied] = useState(emptyFilters),
    [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false);
  const sequence = useRef(0);
  async function load(next = applied) {
    const parsed = documentFiltersSchema.safeParse(next);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const current = ++sequence.current;
    setBusy(true);
    try {
      const data = await apiRequest<DocumentReport>(
        `/api/documents?${query(parsed.data)}`,
        undefined,
        "GET",
      );
      if (current === sequence.current) {
        setReport(data);
        setApplied(parsed.data);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }
  async function download(format: "csv" | "xlsx") {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/documents/export?${query(applied)}&format=${format}`,
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message || "Não foi possível exportar.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `fiscalhub-documentos.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Exportação preparada com os filtros aplicados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na exportação.");
    } finally {
      setExporting(false);
    }
  }
  const m = report.metrics;
  const cards = [
    ["Documentos", String(m.count)],
    ["Valor total", money(m.total)],
    ["Total NF-e", money(m.nfe)],
    ["Total NFC-e", money(m.nfce)],
    ["Itens de produtos", String(m.items)],
    ["Produtos declarados", money(m.products)],
    ["Descontos", money(m.discount)],
    ["Frete", money(m.freight)],
    ["Média por documento", money(m.average)],
    ["Tributos destacados", money(m.taxes)],
    ["Autorização identificada", String(m.authorized)],
    ["Cancelamento identificado", String(m.cancelled)],
    ["Situação não confirmada", String(m.unconfirmed)],
    ["Precisam de análise", String(m.review)],
  ];
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-primary">
            ANÁLISE DE DOCUMENTOS FISCAIS
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Seus XMLs, organizados em informação.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            NF-e, NFC-e e eventos importados, com rastreabilidade até o arquivo
            original.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={exporting || !report.total}
            onClick={() => download("csv")}
          >
            <Download />
            CSV
          </Button>
          <Button
            variant="outline"
            disabled={exporting || !report.total}
            onClick={() => download("xlsx")}
          >
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            Excel
          </Button>
        </div>
      </div>
      <ImportPanel initial={initialImports} onChanged={() => void load()} />
      <DocumentFilterForm
        value={filters}
        onChange={setFilters}
        onApply={(value) => void load({ ...value, page: 1 })}
        busy={busy}
      />
      <div aria-busy={busy} className={`space-y-6 ${busy ? "opacity-60" : ""}`}>
        {busy && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-primary"
          >
            <Loader2 className="size-4 animate-spin" />
            Atualizando a análise...
          </p>
        )}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-6 text-muted-foreground">
          <AlertTriangle className="mr-2 inline size-4 text-amber-600" />
          Os totais representam os XMLs selecionados pelos filtros, incluindo
          cancelados, devoluções e homologação quando selecionados. Não
          equivalem a faturamento ou apuração fiscal. Situações derivam dos
          arquivos importados, sem consulta online ou verificação da assinatura.
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([title, value]) => (
            <section key={title} className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground">{title}</p>
              <p
                className="mt-3 text-2xl font-semibold tracking-tight"
                data-testid={
                  title === "Documentos" ? "document-count" : undefined
                }
              >
                {value}
              </p>
            </section>
          ))}
        </div>
        {m.quantitiesByUnit.length > 0 && (
          <p className="text-xs leading-6 text-muted-foreground">
            Quantidades comerciais por unidade:{" "}
            {m.quantitiesByUnit
              .map(
                (q) =>
                  `${q.quantity
                    .replace(/(\.\d*?)0+$/, "$1")
                    .replace(/\.$/, "")
                    .replace(".", ",")} ${q.unit}`,
              )
              .join(" · ")}
            . Valores conforme os XMLs selecionados.
          </p>
        )}
        {report.total > 0 ? (
          <Charts report={report} />
        ) : (
          <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
            <Files className="mx-auto size-9 text-primary/50" />
            <h2 className="mt-4 font-semibold">
              Nenhum documento nesta seleção.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Importe XMLs ou ajuste os filtros para começar sua análise.
            </p>
          </div>
        )}
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b p-5">
            <h2 className="text-sm font-semibold">Documentos importados</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.total} documento(s) · valores monetários preservados em
              decimal
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {[
                    "Documento",
                    "Emissão",
                    "Destinatário",
                    "Situação identificada",
                    "Valor",
                    "Análise",
                  ].map((t) => (
                    <th key={t} className="px-5 py-3 font-medium">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="min-w-48 px-5 py-4">
                      <Link
                        href={`/documentos/${row.id}`}
                        className="font-medium text-primary"
                      >
                        {row.model === "55" ? "NF-e" : "NFC-e"} {row.number} /{" "}
                        {row.series}
                        <ArrowUpRight className="ml-1 inline size-3" />
                      </Link>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {row.environment === "1" ? "Produção" : "Homologação"} ·{" "}
                        {row.purpose === "4"
                          ? "Devolução"
                          : "Finalidade " + (row.purpose || "não informada")}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs whitespace-nowrap">
                      {dateTime(row.issued_at)}
                    </td>
                    <td className="max-w-60 px-5 py-4 text-xs">
                      <p className="truncate">
                        {row.recipient_name || "Não informado"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {row.recipient_tax_id}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {statusLabels[row.status]}
                    </td>
                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      {money(row.total_value)}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {row.issue_count
                        ? `${row.issue_count} observação(ões)`
                        : "Sem alertas locais"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between border-t p-5 text-xs text-muted-foreground">
            <span>
              Página {report.page} de{" "}
              {Math.max(1, Math.ceil(report.total / 25))}
            </span>
            <div className="flex gap-2">
              {report.page > 1 && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => load({ ...applied, page: report.page - 1 })}
                >
                  Anterior
                </Button>
              )}
              {report.page * 25 < report.total && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => load({ ...applied, page: report.page + 1 })}
                >
                  Próxima
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
