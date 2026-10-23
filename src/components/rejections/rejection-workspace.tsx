"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Search,
  BookOpenText,
  History,
  ArrowUpRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/http-client";
import { dateTime } from "@/lib/format";
import type { RejectionSearch, RejectionHistory } from "@/types/rejections";
import { FavoriteButton } from "./favorite-button";
export function RejectionWorkspace({
  initialResults,
  initialHistory,
  initialQuery,
}: {
  initialResults: RejectionSearch;
  initialHistory: RejectionHistory;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    [model, setModel] = useState(""),
    [favorites, setFavorites] = useState(false),
    [identify, setIdentify] = useState(false),
    [results, setResults] = useState(initialResults),
    [history, setHistory] = useState(initialHistory),
    [busy, setBusy] = useState(false),
    [clear, setClear] = useState(false),
    [submittedIdentify, setSubmittedIdentify] = useState(false);
  async function search(
    page = 1,
    overrides: Partial<{
      query: string;
      model: string;
      favorites: boolean;
      identify: boolean;
    }> = {},
  ) {
    const next = { query, model, favorites, identify, ...overrides };
    setQuery(next.query);
    setModel(next.model);
    setFavorites(next.favorites);
    setIdentify(next.identify);
    setBusy(true);
    try {
      const data = await apiRequest<RejectionSearch>("/api/rejections", {
        ...next,
        model: next.model || null,
        page,
      });
      setResults(data);
      setSubmittedIdentify(next.identify);
      setHistory(
        await apiRequest<RejectionHistory>(
          "/api/rejections/history",
          undefined,
          "GET",
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao pesquisar.");
    } finally {
      setBusy(false);
    }
  }
  async function clearHistory() {
    setBusy(true);
    try {
      await apiRequest("/api/rejections/history", undefined, "DELETE");
      setHistory([]);
      setClear(false);
      toast.success("Histórico de pesquisas excluído.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-7">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-primary-text">
          BASE DE CONHECIMENTO FISCAL
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Consulta de Rejeições
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Encontre o significado da mensagem, os campos envolvidos e o que
          conferir no ERP, com referências oficiais e orientações práticas da
          Oobj.
        </p>
      </header>
      <section className="rounded-2xl border bg-card p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!identify ? "default" : "outline"}
            disabled={busy}
            onClick={() => setIdentify(false)}
          >
            Buscar no catálogo
          </Button>
          <Button
            size="sm"
            variant={identify ? "default" : "outline"}
            disabled={busy}
            onClick={() => setIdentify(true)}
          >
            Identificar mensagem do ERP
          </Button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label htmlFor="rejection-query" className="text-sm font-medium">
            {identify
              ? "Cole a mensagem de rejeição"
              : "Código ou parte da mensagem"}
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            {identify ? (
              <textarea
                id="rejection-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={500}
                disabled={busy}
                rows={3}
                placeholder="Ex.: cStat: 694 — Não informado o grupo de ICMS para a UF de destino"
                className="w-full min-w-0 rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <Input
                id="rejection-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={500}
                disabled={busy}
                placeholder="Ex.: 694, falha no schema XML, CFOP inexistente"
                className="h-11"
              />
            )}
            <Button type="submit" disabled={busy} className="h-11">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {identify ? "Identificar" : "Pesquisar"}
            </Button>
          </div>
          {identify && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Até 500 caracteres. A mensagem completa do ERP não é salva no
              histórico. Remova dados pessoais antes de colar.
            </p>
          )}
        </form>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t pt-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Documento
            <select
              aria-label="Filtrar por modelo"
              disabled={busy}
              value={model}
              onChange={(e) => void search(1, { model: e.target.value })}
              className="rounded-lg border bg-background px-3 py-2 text-foreground"
            >
              <option value="">NF-e e NFC-e</option>
              <option value="55">NF-e · 55</option>
              <option value="65">NFC-e · 65</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={favorites}
              disabled={busy}
              onChange={(e) => void search(1, { favorites: e.target.checked })}
            />
            Somente favoritos
          </label>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void search(1, {
                query: "",
                model: "",
                favorites: false,
                identify: false,
              })
            }
          >
            Limpar filtros
          </Button>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{results.catalogSize}</strong>{" "}
          rejeições revisadas na base local · {results.total} resultado(s)
        </span>
        <span>
          Última revisão:{" "}
          {results.reviewedAt ? dateTime(results.reviewedAt) : "sem registros"}
        </span>
      </div>
      <p className="rounded-lg border bg-primary/5 p-4 text-xs leading-6 text-muted-foreground">
        A pesquisa usa o catálogo instalado. Não há busca automática na internet
        nem cobertura de todas as rejeições. Novas entradas e revisões são
        publicadas por atualizações versionadas.
      </p>
      {submittedIdentify && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${results.identifiedCode ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
        >
          {results.identifiedCode ? (
            <>
              Correspondência{" "}
              {results.identification === "code"
                ? "pelo código informado"
                : "pela descrição exata"}
              :{" "}
              <Link
                className="font-semibold text-primary-text underline"
                href={`/rejeicoes/${results.identifiedCode}`}
              >
                rejeição {results.identifiedCode}
              </Link>
              . Confira se a descrição corresponde ao retorno do ERP.
            </>
          ) : results.identification === "ambiguous" ? (
            "A mensagem contém mais de um código. Não foi possível identificar uma única crítica."
          ) : (
            "Não foi possível identificar a crítica com confiança. Eventuais resultados abaixo são apenas sugestões."
          )}
        </div>
      )}
      {!results.items.length ? (
        <section className="rounded-xl border bg-card px-6 py-14 text-center">
          <BookOpenText className="mx-auto size-9 text-muted-foreground/60" />
          <h2 className="mt-4 font-semibold">Nenhuma rejeição encontrada</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Tente o código exato, menos palavras ou outro filtro. A ausência
            nesta base não significa que a mensagem seja inválida.
          </p>
          <a
            href="https://oobj.com.br/bc/"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm text-primary-text underline"
          >
            Abrir base original da Oobj
            <ArrowUpRight className="size-4" />
          </a>
        </section>
      ) : (
        <section
          aria-label="Resultados de rejeições"
          className="grid gap-4 md:grid-cols-2"
        >
          {results.items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-sm font-semibold text-primary-text">
                  {item.code}
                </span>
                <FavoriteButton
                  key={`${item.id}-${item.favorite}`}
                  code={item.code}
                  initial={item.favorite}
                  onChange={(value) =>
                    setResults((old) => ({
                      ...old,
                      total: favorites && !value ? old.total - 1 : old.total,
                      items:
                        favorites && !value
                          ? old.items.filter((i) => i.id !== item.id)
                          : old.items.map((i) =>
                              i.id === item.id ? { ...i, favorite: value } : i,
                            ),
                    }))
                  }
                />
              </div>
              <Link
                href={`/rejeicoes/${item.code}`}
                className="mt-4 block text-base font-semibold leading-6 hover:text-primary-text"
              >
                {item.title}
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                {item.models
                  .map((m) => (m === "55" ? "NF-e" : "NFC-e"))
                  .join(" · ")}
                {item.match_kind === "approximate"
                  ? " · Resultado aproximado"
                  : ""}
              </p>
              <Link
                href={`/rejeicoes/${item.code}`}
                className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-primary-text"
              >
                Ver causas e orientação
                <ArrowUpRight className="size-3.5" />
              </Link>
            </article>
          ))}
        </section>
      )}
      <div className="flex items-center justify-end gap-3 text-xs">
        <Button
          size="sm"
          variant="outline"
          disabled={busy || results.page <= 1}
          onClick={() => void search(results.page - 1)}
        >
          Anterior
        </Button>
        <span>Página {results.page}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || results.page * 12 >= results.total}
          onClick={() => void search(results.page + 1)}
        >
          Próxima
        </Button>
      </div>
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4 text-primary-text" />
            Últimas 20 pesquisas
          </h2>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !history.length}
            onClick={() => setClear(true)}
          >
            <Trash2 className="size-4" />
            Limpar histórico
          </Button>
        </div>
        {!history.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Suas pesquisas aparecerão aqui após a primeira consulta.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap justify-between gap-2 py-3 text-xs"
              >
                <span className="max-w-full break-words">{h.query}</span>
                <time className="text-muted-foreground">
                  {dateTime(h.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Dialog
        open={clear}
        onOpenChange={(open) => {
          if (!busy) setClear(open);
        }}
      >
        <DialogContent>
          <DialogTitle>Excluir histórico de rejeições?</DialogTitle>
          <DialogDescription>
            Todas as pesquisas de rejeições desta conta serão removidas. Seus
            favoritos continuam disponíveis.
          </DialogDescription>
          <Button variant="destructive" disabled={busy} onClick={clearHistory}>
            Confirmar exclusão do histórico
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
