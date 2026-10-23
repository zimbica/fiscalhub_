import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CircleDollarSign,
  FileStack,
  Fingerprint,
  History,
  ScanLine,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getDashboard,
  getWorkspace,
  activityNames,
} from "@/services/workspace";
import { dateTime, money } from "@/lib/format";
import { modules } from "@/lib/navigation";
export const metadata = { title: "Visão geral" };

export default async function Dashboard() {
  const [{ summary, events }, { profile }] = await Promise.all([
    getDashboard(),
    getWorkspace(),
  ]);
  const metrics = [
    {
      label: "Documentos importados",
      value: String(summary.documents),
      icon: FileStack,
      detail: "NF-e e NFC-e na sua conta",
    },
    {
      label: "Valor dos documentos",
      value: money(summary.totalValue),
      icon: CircleDollarSign,
      detail: "Total dos XMLs importados",
    },
    {
      label: "Validações realizadas",
      value: String(summary.validations),
      icon: ShieldCheck,
      detail: "Análises salvas no seu histórico",
    },
    {
      label: "Empresas consultadas",
      value: String(summary.companies),
      icon: Building2,
      detail: "Cadastros associados a você",
    },
  ];
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Seu
            ambiente de trabalho
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            Olá, {profile.full_name.split(" ")[0]}{" "}
            <span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Uma visão clara de tudo que acontece no seu espaço fiscal.
          </p>
        </div>
        <Button asChild variant="outline" className="h-10 bg-card">
          <Link href="/configuracoes">
            <Settings2 /> Personalizar meu espaço
          </Link>
        </Button>
      </div>
      <section
        aria-label="Indicadores da sua conta"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, icon: Icon, detail }) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-5 shadow-[0_2px_6px_#17243b02]"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <span className="rounded-lg bg-primary/5 p-2">
                <Icon className="size-4 text-primary" />
              </span>
            </div>
            <p className="mt-4 text-[29px] font-semibold tracking-tight tabular-nums">
              {value}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 className="text-sm font-semibold">Comece pelo seu espaço</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Uma base organizada para os próximos passos.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
              ETAPA 04
            </span>
          </div>
          <div className="grid items-center gap-7 p-6 sm:grid-cols-[1fr_160px]">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">
                Tudo começa com uma
                <br />
                base bem construída.
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                Sua conta está pronta. Ajuste seu perfil e a aparência e
                consulte os dados cadastrais de uma empresa. Importe documentos
                e confira estrutura, schemas e regras locais no validador.
              </p>
              <Button asChild className="mt-6 h-10">
                <Link href="/consulta-cnpj">
                  Consultar CNPJ <ArrowRight />
                </Link>
              </Button>
            </div>
            <div
              aria-hidden="true"
              className="relative mx-auto hidden size-36 items-center justify-center rounded-full border border-primary/10 bg-primary/[0.03] sm:flex"
            >
              <div className="flex size-24 items-center justify-center rounded-2xl border border-primary/15 bg-card shadow-lg shadow-primary/5">
                <ScanLine className="size-12 text-primary" strokeWidth={1.2} />
              </div>
              <div className="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full border-4 border-card bg-emerald-500 text-white">
                <Check className="size-4" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-5 border-t bg-muted/30 px-6 py-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" /> Dados
              isolados por conta
            </span>
            <span className="flex items-center gap-1.5">
              <Fingerprint className="size-3.5 text-primary" /> Autenticação
              Supabase
            </span>
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Atividade recente</h2>
            <History className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-6 space-y-5">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/50" />
                <div>
                  <p className="text-xs font-medium">
                    {activityNames[event.action] || "Atividade registrada"}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {dateTime(event.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">
                Suas próximas atividades aparecerão aqui.
              </p>
            )}
          </div>
          <Button asChild variant="link" className="mt-6 h-auto px-0 text-xs">
            <Link href="/historico">
              Ver todo o histórico <ArrowUpRight />
            </Link>
          </Button>
        </section>
      </div>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Seu FiscalHub, passo a passo
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Recursos disponíveis e próximos módulos do seu espaço fiscal.
            </p>
          </div>
          <Link
            href="/projeto"
            className="flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            Acompanhar etapas <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ title, description, stage, icon: Icon }) => (
            <Link
              key={title}
              href={
                stage === 2
                  ? "/consulta-cnpj"
                  : stage === 3
                    ? "/documentos"
                    : stage === 4
                      ? "/validador"
                      : `/projeto#etapa-${stage}`
              }
              className="group rounded-xl border bg-card p-5 transition hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-muted-foreground transition group-hover:text-primary" />
                <span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                  {stage <= 4 ? "Disponível" : `Etapa ${stage}`}
                </span>
              </div>
              <h3 className="mt-5 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                {stage === 2
                  ? "Consultar uma empresa"
                  : stage === 3
                    ? "Analisar documentos"
                    : stage === 4
                      ? "Validar XML"
                      : "Ver o que será entregue"}{" "}
                <ArrowUpRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <p className="text-[11px] leading-5 text-muted-foreground">
        Os indicadores usam apenas registros da sua conta. Importe XMLs para
        alimentar a análise fiscal. O validador executa verificações locais; o
        catálogo de rejeições será adicionado na próxima etapa.
      </p>
    </div>
  );
}
