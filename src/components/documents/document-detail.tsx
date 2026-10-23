"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Trash2,
  Copy,
  Loader2,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { dateTime, money } from "@/lib/format";
import { apiRequest } from "@/lib/http-client";
import { statusLabels, paymentLabels } from "@/lib/documents/filters";
import type { DocumentDetail } from "@/types/document-report";
import type { FiscalIssue } from "@/types/fiscal";
import type { Json } from "@/types/database";
function JsonDetails({ title, value }: { title: string; value: Json }) {
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-medium">{title}</summary>
      <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted/40 p-4 text-xs leading-6">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
function Party({ title, data }: { title: string; data: Json }) {
  const record = (data || {}) as Record<string, Json>;
  const address = (record.enderEmit || record.enderDest || {}) as Record<
    string,
    Json
  >;
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-4 font-medium">
        {String(record.xNome || "Não informado")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {String(
          record.CNPJ ||
            record.CPF ||
            record.idEstrangeiro ||
            "Identificador não informado",
        )}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
        {[
          ["Nome fantasia", record.xFant],
          ["Inscrição Estadual", record.IE],
          ["CRT informado", record.CRT],
          [
            "Município / UF",
            [address.xMun, address.UF].filter(Boolean).join(" / "),
          ],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt className="text-muted-foreground">{String(label)}</dt>
            <dd className="mt-1">{String(value || "Não informado")}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <JsonDetails title="Todos os campos cadastrais do XML" value={data} />
      </div>
    </section>
  );
}
export function DocumentDetailView({ data }: { data: DocumentDetail }) {
  const { document: d, items, payments, events, files } = data;
  const router = useRouter();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const issues = (Array.isArray(d.issues)
    ? d.issues
    : []) as unknown as FiscalIssue[];
  async function remove() {
    setBusy(true);
    try {
      for (;;) {
        const result = await apiRequest<{ done: boolean }>(
          `/api/documents/${d.id}`,
          undefined,
          "DELETE",
        );
        if (result.done) break;
      }
      toast.success("Documento e arquivos associados excluídos.");
      router.push("/documentos");
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Exclusão interrompida. Tente novamente.",
      );
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(d.access_key);
      toast.success("Chave copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }
  return (
    <div className="space-y-6">
      <Link
        href="/documentos"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Voltar à análise
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-primary">
            DETALHES DO DOCUMENTO
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {d.model === "55" ? "NF-e" : "NFC-e"} {d.number} · Série {d.series}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusLabels[d.status as keyof typeof statusLabels]} ·{" "}
            {d.environment === "1" ? "Produção" : "Homologação"} · Leiaute{" "}
            {d.layout_version}
          </p>
        </div>
        <Button variant="outline" onClick={() => setConfirm(true)}>
          <Trash2 />
          Excluir documento
        </Button>
      </div>
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Chave de acesso</p>
            <p className="mt-2 break-all font-mono text-sm">{d.access_key}</p>
          </div>
          <Button variant="outline" onClick={copy}>
            <Copy />
            Copiar chave
          </Button>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Emissão", dateTime(d.issued_at)],
            [
              "Autorização",
              d.authorized_at ? dateTime(d.authorized_at) : "Não identificada",
            ],
            ["Natureza da operação", d.operation_nature || "Não informada"],
            [
              "Finalidade",
              d.purpose === "4"
                ? "4 · Devolução"
                : d.purpose || "Não informada",
            ],
            ["Tipo de emissão", d.emission_type || "Não informado"],
            [
              "Tipo de operação",
              d.operation_type === "1"
                ? "Saída"
                : d.operation_type === "0"
                  ? "Entrada"
                  : "Não informado",
            ],
            ["Valor total", money(d.total_value)],
            ["Frete", money(d.freight_value)],
            ["Produtos", money(d.product_value)],
            ["Desconto", money(d.discount_value)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-6 text-muted-foreground">
        <AlertTriangle className="mr-2 inline size-4 text-amber-600" />A
        situação foi identificada nas evidências importadas. Não houve consulta
        à SEFAZ nem validação de autenticidade da assinatura. Devolução e
        cancelamento são tratados separadamente.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Party title="Emitente" data={d.issuer} />
        <Party title="Destinatário" data={d.recipient} />
      </div>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">
          Indicadores de análise ({issues.length})
        </h2>
        {issues.length ? (
          <div className="space-y-3">
            {issues.map((issue, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 text-sm ${issue.severity === "inconsistency" ? "border-destructive/30 bg-destructive/5" : "border-amber-500/25 bg-amber-500/5"}`}
              >
                <p className="text-xs font-semibold">
                  {issue.severity === "inconsistency"
                    ? "Inconsistência observada"
                    : "Alerta para análise"}{" "}
                  · {issue.code}
                </p>
                <p className="mt-2">{issue.message}</p>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  {issue.path}
                </p>
                {issue.found && (
                  <p className="mt-2 text-xs">
                    Encontrado: {issue.found} · Referência do cálculo:{" "}
                    {issue.expected}
                  </p>
                )}
                <a
                  href={issue.source}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-primary"
                >
                  Referência do leiaute ↗
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma observação nas verificações de importação executadas. Isso
            não equivale à aprovação por XSD ou regras fiscais completas.
          </p>
        )}
      </section>
      <section className="overflow-hidden rounded-xl border bg-card">
        <h2 className="border-b p-5 text-sm font-semibold">
          Produtos ({items.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                {[
                  "Item / produto",
                  "GTIN",
                  "NCM / CEST",
                  "CFOP / CST",
                  "Quantidade / un.",
                  "Valor unitário",
                  "Valor produtos",
                  "Desconto",
                  "Tributos e campos",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="min-w-52 px-4 py-4">
                    <p className="font-medium">
                      {item.item_number} · {item.description}
                    </p>
                    <p className="mt-1 text-muted-foreground">{item.code}</p>
                  </td>
                  <td className="px-4 py-4">{item.gtin || "—"}</td>
                  <td className="px-4 py-4">
                    {item.ncm || "—"}
                    <br />
                    {item.cest}
                  </td>
                  <td className="px-4 py-4">
                    {item.cfop || "—"}
                    <br />
                    {item.tax_situation}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {item.unit_value}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {money(item.total_value)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {money(item.discount_value)}
                  </td>
                  <td className="min-w-56 px-4 py-4">
                    <JsonDetails title="Ver tributos" value={item.taxes} />
                    <JsonDetails title="Campos do produto" value={item.data} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">
            Tributos e totais do XML
          </h2>
          <JsonDetails
            title="Totais destacados extraídos"
            value={d.tax_totals}
          />
          <div className="mt-3">
            <JsonDetails
              title="Todos os grupos de totais, incluindo IBS/CBS"
              value={d.other_totals}
            />
          </div>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Pagamentos</h2>
          {payments.length ? (
            payments.map((p) => (
              <div key={p.id} className="mb-3 rounded-lg border p-3">
                <div className="mb-3 flex justify-between gap-2 text-sm">
                  <span>{paymentLabels[p.method] || p.method}</span>
                  <strong>{money(p.value)}</strong>
                </div>
                <JsonDetails title="Campos do pagamento" value={p.data} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Não informado neste XML.
            </p>
          )}
          <JsonDetails
            title="Troco e demais informações originais"
            value={d.data}
          />
        </section>
      </div>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">
          Eventos identificados ({events.length})
        </h2>
        {events.length ? (
          events.map((event) => (
            <div key={event.id} className="mb-3 rounded-lg border p-4">
              <p className="text-sm font-medium">
                {event.event_type === "110111"
                  ? "Cancelamento"
                  : event.event_type === "110112"
                    ? "Cancelamento por substituição"
                    : `Evento ${event.event_type}`}{" "}
                · sequência {event.sequence}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {event.accepted
                  ? "Registro vinculado identificado no retorno"
                  : "Registro não confirmado"}{" "}
                · cStat {event.status_code || "não informado"} · Protocolo{" "}
                {event.protocol || "não informado"}
              </p>
              <p className="my-3 text-xs text-muted-foreground">
                Evento:{" "}
                {event.occurred_at
                  ? dateTime(event.occurred_at)
                  : "não informado"}{" "}
                · Registro:{" "}
                {event.registered_at
                  ? dateTime(event.registered_at)
                  : "não informado"}
              </p>
              <JsonDetails
                title="Evidências do evento"
                value={event.evidence}
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum evento importado para esta chave e ambiente.
          </p>
        )}
        <div className="mt-4">
          <JsonDetails
            title="Evidências de autorização / denegação"
            value={d.evidence}
          />
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">
          Arquivos originais ({files.length})
        </h2>
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="break-all text-sm">{file.filename}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dateTime(file.created_at)}
                </p>
              </div>
              {file.original_path && (
                <a
                  href={`/api/import-files/${file.id}`}
                  className="inline-flex items-center gap-2 text-xs font-medium text-primary"
                >
                  <Download className="size-4" />
                  Baixar XML original
                </a>
              )}
            </div>
          ))}
        </div>
        <details className="mt-5 rounded-lg bg-muted/40 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            <FileCheck2 className="mr-2 inline size-4" />
            Validação fiscal · próxima etapa
          </summary>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            O editor, a validação XSD oficial e as regras fiscais completas
            serão implementados na etapa 4. Nenhuma alteração foi feita nos XMLs
            assinados.
          </p>
          <Link
            href="/projeto#etapa-4"
            className="mt-2 inline-block text-xs text-primary"
          >
            Ver escopo da etapa 4
          </Link>
        </details>
      </section>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
      >
        <DialogContent>
          <DialogTitle>Excluir documento e arquivos?</DialogTitle>
          <DialogDescription>
            Esta ação remove a nota, seus itens, pagamentos, originais e eventos
            associados desta conta. O histórico dos lotes registra o
            processamento anterior.
          </DialogDescription>
          <Button variant="destructive" disabled={busy} onClick={remove}>
            {busy && <Loader2 className="animate-spin" />}Excluir documento e
            arquivos
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
