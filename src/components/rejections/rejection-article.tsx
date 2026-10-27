"use client";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  Copy,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dateTime } from "@/lib/format";
import type { RejectionDetail } from "@/types/rejections";
import { FavoriteButton } from "./favorite-button";
export function RejectionArticle({ entry }: { entry: RejectionDetail }) {
  const causes = Array.isArray(entry.causes)
      ? entry.causes.filter((s): s is string => typeof s === "string")
      : [],
    corrections = Array.isArray(entry.corrections)
      ? entry.corrections.filter((s): s is string => typeof s === "string")
      : [];
  const sources = [...entry.rejection_sources].sort(
    (a, b) => Number(b.is_official) - Number(a.is_official),
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        [
          `Rejeição ${entry.code} — ${entry.title}`,
          entry.explanation,
          ...corrections,
          entry.scope_note,
          ...sources.map((s) => s.url),
        ].join("\n"),
      );
      toast.success("Orientação e fontes copiadas.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }
  return (
    <article className="mx-auto max-w-5xl space-y-4">
      <Link
        href="/rejeicoes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary-text"
      >
        <ArrowLeft className="size-4" />
        Voltar ao catálogo
      </Link>
      <header className="rounded-lg border bg-card p-4 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-text">
            <BookOpenText className="size-4" />
            Rejeição {entry.code}
          </span>
          <FavoriteButton code={entry.code} initial={entry.favorite} />
        </div>
        <h1 className="mt-5 text-xl font-semibold leading-tight sm:text-xl">
          {entry.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            {entry.models
              .map((m) => (m === "55" ? "NF-e" : "NFC-e"))
              .join(" · ")}
          </span>
          <span>Revisão editorial: {dateTime(entry.reviewed_at)}</span>
          <span>Versão {entry.revision}</span>
        </div>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-md border bg-card p-4">
            <h2 className="font-semibold">O que significa?</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {entry.explanation}
            </p>
            <h2 className="mt-7 font-semibold">Por que ocorre?</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              {causes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Como resolver?</h2>
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="size-4" />
                Copiar orientação
              </Button>
            </div>
            <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-7">
              {corrections.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </section>
          <section className="rounded-md border bg-card p-4">
            <h2 className="font-semibold">Onde verificar no XML?</h2>
            <ul className="mt-4 space-y-2">
              {entry.xml_fields.map((field) => (
                <li
                  key={field}
                  className="break-all rounded bg-muted px-3 py-2 font-mono text-xs"
                >
                  {field}
                </li>
              ))}
            </ul>
            {entry.code === "215" && (
              <Link
                href="/validador"
                className="mt-5 inline-block text-sm text-primary-text underline"
              >
                Abrir validador de XML
              </Link>
            )}
          </section>
          {entry.example && (
            <section className="min-w-0 rounded-md border bg-card p-4">
              <h2 className="font-semibold">Exemplo ilustrativo</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Fragmento para entender o problema. Não é documento completo nem
                correção universal.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-6">
                {entry.example}
              </pre>
            </section>
          )}
        </div>
        <aside className="min-w-0 space-y-5">
          <section className="rounded-md border border-amber-500/25 bg-amber-500/5 p-4">
            <h2 className="text-sm font-semibold">Condições e exceções</h2>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {entry.scope_note}
            </p>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              Confirme a UF, a data, o modelo e as Notas Técnicas aplicáveis. A
              data de revisão não define vigência legal.
            </p>
          </section>
          <section className="rounded-md border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary-text" />
              Fontes
            </h2>
            <div className="mt-4 space-y-4">
              {sources.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs leading-5 text-primary-text hover:underline"
                >
                  <span className="mb-1 block text-[10px] text-muted-foreground">
                    {s.is_official
                      ? "REFERÊNCIA OFICIAL"
                      : "EXPLICAÇÃO PRÁTICA"}{" "}
                    · {s.publisher}
                  </span>
                  {s.title}
                  <ExternalLink className="ml-1 inline size-3" />
                </a>
              ))}
            </div>
          </section>
          {!!entry.related.length && (
            <section className="rounded-md border bg-card p-4">
              <h2 className="text-sm font-semibold">Rejeições relacionadas</h2>
              <div className="mt-4 space-y-3">
                {entry.related.map((r) => (
                  <Link
                    key={r.code}
                    href={`/rejeicoes/${r.code}`}
                    className="block text-xs leading-5 text-primary-text hover:underline"
                  >
                    {r.code} — {r.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Resumo próprio a partir das referências. O FiscalHub não consulta a
        SEFAZ nesta tela e não altera documentos assinados.
      </p>
    </article>
  );
}
