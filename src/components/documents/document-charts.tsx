"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import type { DocumentReport, ChartPoint } from "@/types/document-report";
import { paymentLabels } from "@/lib/documents/filters";
import { money } from "@/lib/format";
function Chart({
  title,
  points,
  area = false,
  quantity = false,
}: {
  title: string;
  points: ChartPoint[];
  area?: boolean;
  quantity?: boolean;
}) {
  const data = points.map((p) => ({
    name: p.label,
    value: Number(p.value),
    exact: p.value,
  }));
  const tooltip = (
    <Tooltip
      content={({ active, payload }) => {
        const row = payload?.[0]?.payload as
          { name: string; exact: string } | undefined;
        return active && row ? (
          <div className="max-w-64 rounded-lg border bg-card p-3 text-xs shadow-lg">
            <p className="mb-1 font-medium">{row.name}</p>
            {quantity ? row.exact : money(row.exact)}
          </div>
        ) : null;
      }}
    />
  );
  return (
    <section className="min-w-0 rounded-xl border bg-card p-5">
      <h3 className="mb-5 text-sm font-semibold">{title}</h3>
      {data.length ? (
        <div className="h-56 w-full" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            {area ? (
              <AreaChart
                data={data}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  width={45}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                    }).format(v)
                  }
                />
                {tooltip}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.12}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => String(v).slice(0, 14)}
                  minTickGap={12}
                />
                <YAxis
                  width={45}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                    }).format(v)
                  }
                />
                {tooltip}
                <Bar
                  dataKey="value"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center text-center text-xs text-muted-foreground">
          Sem dados para os filtros selecionados.
        </div>
      )}
    </section>
  );
}
export function DocumentCharts({ report }: { report: DocumentReport }) {
  const c = report.charts;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-semibold">Panorama dos documentos</h2>
        <p className="text-xs text-muted-foreground">
          Até 180 dias, 36 meses e top 10 produtos/CFOPs.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Chart title="Evolução de valores por dia" points={c.daily} area />
        <Chart title="Evolução de valores por mês" points={c.monthly} />
        <Chart
          title="NF-e × NFC-e · valores"
          points={c.models.map((p) => ({
            ...p,
            label: p.label === "55" ? "NF-e" : "NFC-e",
          }))}
        />
        <Chart
          title="Quantidade de documentos por dia"
          points={c.daily.map((p) => ({ ...p, value: String(p.count || 0) }))}
          area
          quantity
        />
        <Chart
          title="Formas de pagamento · valores declarados"
          points={c.payments.map((p) => ({
            ...p,
            label: paymentLabels[p.label] || p.label,
          }))}
        />
        <Chart
          title="Produtos · valor dos itens menos desconto"
          points={c.products}
        />
        <Chart
          title="Produtos · quantidade comercial por unidade"
          points={c.quantities}
          quantity
        />
        <Chart
          title="CFOPs · quantidade de itens"
          points={c.cfops.map((p) => ({ ...p, value: String(p.count || 0) }))}
          quantity
        />
        <Chart
          title="Operações por UF · valor dos documentos"
          points={c.states}
        />
        <Chart
          title="Tributos destacados · valores declarados"
          points={c.taxes}
        />
        <Chart
          title="Composição · valores declarados"
          points={[
            { label: "Produtos", value: report.metrics.products },
            { label: "Descontos", value: report.metrics.discount },
            { label: "Frete", value: report.metrics.freight },
            { label: "Total NF", value: report.metrics.total },
          ]}
        />
        <Chart title="CFOPs · valor dos produtos" points={c.cfops} />
      </div>
    </div>
  );
}
