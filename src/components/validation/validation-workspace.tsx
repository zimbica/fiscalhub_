"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import xmlFormat from "xml-formatter";
import {
  UploadCloud,
  ScanSearch,
  Loader2,
  FileCode2,
  History,
  Trash2,
  LockKeyhole,
  FolderOpen,
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
import { parseXml, MAX_XML_BYTES } from "@/services/xml/tree";
import type { ValidationReport } from "@/types/validation";
import type { DocumentReport, DocumentDetail } from "@/types/document-report";
import type { listValidations } from "@/services/validations";
import { ValidationResults, stateLabel } from "./validation-results";
const XmlEditor = dynamic(
  () => import("./xml-editor").then((m) => m.XmlEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
        Carregando editor…
      </div>
    ),
  },
);
type HistoryData = Awaited<ReturnType<typeof listValidations>>;
export function ValidationWorkspace({
  initialHistory,
  initialSource,
}: {
  initialHistory: HistoryData;
  initialSource?: string;
}) {
  const [raw, setRaw] = useState(""),
    [filename, setFilename] = useState("documento.xml"),
    [source, setSource] = useState<string | undefined>(),
    [locked, setLocked] = useState(false),
    [editing, setEditing] = useState(false);
  const [formatted, setFormatted] = useState<string | null>(null),
    [report, setReport] = useState<ValidationReport | null>(null),
    [busy, setBusy] = useState(false),
    [focus, setFocus] = useState<{ line: number; nonce: number }>();
  const [history, setHistory] = useState(initialHistory),
    [deleting, setDeleting] = useState<string | null>(null),
    [picker, setPicker] = useState(false),
    [search, setSearch] = useState(""),
    [documents, setDocuments] = useState<DocumentReport["rows"]>([]),
    [finding, setFinding] = useState(false);
  const loaded = useRef<string | undefined>(undefined),
    loadVersion = useRef(0);
  const showXml = useCallback(
    (text: string, name: string, sourceId?: string) => {
      setRaw(text);
      setFilename(name);
      setSource(sourceId);
      setLocked(true);
      setFormatted(null);
      setReport(null);
    },
    [],
  );
  const loadOriginal = useCallback(
    async function loadOriginal(id: string) {
      const version = ++loadVersion.current;
      setBusy(true);
      try {
        const response = await fetch(
          `/api/import-files/${encodeURIComponent(id)}`,
        );
        if (!response.ok)
          throw new Error("Original não disponível para esta conta.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > MAX_XML_BYTES) throw new Error("XML excede 2 MiB.");
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (version === loadVersion.current) {
          showXml(text, "original-importado.xml", id);
          setPicker(false);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Falha ao carregar XML.",
        );
      } finally {
        if (version === loadVersion.current) setBusy(false);
      }
    },
    [showXml],
  );
  useEffect(() => {
    if (initialSource && loaded.current !== initialSource) {
      loaded.current = initialSource;
      void loadOriginal(initialSource);
    }
  }, [initialSource, loadOriginal]); // Initial server-validated pointer; no session data in URL.
  async function readFile(file?: File) {
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".xml") ||
      file.size > MAX_XML_BYTES
    ) {
      toast.error("Selecione um XML de até 2 MiB.");
      return;
    }
    try {
      showXml(
        new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        ),
        file.name,
      );
    } catch {
      toast.error("Arquivo não está em UTF-8.");
    }
  }
  async function refreshHistory(page = 1) {
    setHistory(
      await apiRequest<HistoryData>(
        `/api/validations?page=${page}`,
        undefined,
        "GET",
      ),
    );
  }
  async function validate() {
    if (!raw.trim()) {
      toast.error("Insira um XML antes de validar.");
      return;
    }
    const bytes = new TextEncoder().encode(raw);
    if (bytes.length > MAX_XML_BYTES) {
      toast.error("XML excede 2 MiB.");
      return;
    }
    setBusy(true);
    setReport(null);
    setFormatted(null);
    try {
      const params = new URLSearchParams({ name: filename });
      if (source) params.set("source", source);
      const response = await fetch(`/api/validations?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: source ? undefined : bytes,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message || "Falha ao validar.");
      setReport(payload.data);
      await refreshHistory();
      toast.success("Verificações concluídas e histórico salvo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao validar.");
    } finally {
      setBusy(false);
    }
  }
  function toggleFormatted() {
    if (formatted !== null) {
      setFormatted(null);
      return;
    }
    try {
      parseXml(new TextEncoder().encode(raw));
      setFormatted(
        xmlFormat(raw, {
          indentation: "  ",
          lineSeparator: "\n",
          collapseContent: true,
        }),
      );
    } catch {
      toast.error("Corrija a estrutura XML antes de formatar a visualização.");
    }
  }
  async function openHistory(id: string) {
    setBusy(true);
    try {
      const [saved, original] = await Promise.all([
        apiRequest<ValidationReport>(
          `/api/validations/${id}`,
          undefined,
          "GET",
        ),
        fetch(`/api/validations/${id}?format=xml`),
      ]);
      if (!original.ok) throw new Error("Original não disponível.");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await original.arrayBuffer(),
      );
      showXml(text, saved.filename);
      setReport(saved);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao abrir histórico.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiRequest(`/api/validations/${deleting}`, undefined, "DELETE");
      if (report?.id === deleting) setReport(null);
      setDeleting(null);
      await refreshHistory();
      toast.success("Validação e original excluídos.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir.");
    } finally {
      setBusy(false);
    }
  }
  async function findDocuments() {
    setFinding(true);
    try {
      const r = await apiRequest<DocumentReport>(
        `/api/documents?key=${encodeURIComponent(search)}`,
        undefined,
        "GET",
      );
      setDocuments(r.rows);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao pesquisar.",
      );
    } finally {
      setFinding(false);
    }
  }
  async function selectDocument(id: string) {
    try {
      const detail = await apiRequest<DocumentDetail>(
        `/api/documents/${id}`,
        undefined,
        "GET",
      );
      const file = detail.files.find((f) => f.original_path);
      if (!file) throw new Error("Documento sem original disponível.");
      await loadOriginal(file.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao carregar.",
      );
    }
  }
  return (
    <div className="space-y-7">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-primary-text">
          VALIDAÇÃO FISCAL LOCAL
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Validador de XML
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Confira estrutura, schemas oficiais e regras locais. Entenda cada
          inconsistência com a mensagem original, a linha e a fonte da
          verificação.
        </p>
      </header>
      <section className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileCode2 className="size-5 text-primary-text" />
            Documento para validação
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              setPicker(true);
              void findDocuments();
            }}
          >
            <FolderOpen className="size-4" />
            Carregar importado
          </Button>
        </div>
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!busy) void readFile(event.dataTransfer.files[0]);
          }}
          className="mt-5 rounded-lg border border-dashed p-5 text-center"
        >
          <UploadCloud className="mx-auto size-6 text-primary-text" />
          <label className="mt-3 inline-block cursor-pointer text-sm font-medium text-primary-text">
            Selecionar XML
            <input
              aria-label="Selecionar XML para validar"
              type="file"
              accept=".xml,application/xml,text/xml"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Arraste um arquivo de até 2 MiB ou cole o código no editor abaixo.
          </p>
        </div>
        <div className="my-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-full truncate text-xs text-muted-foreground">
            {filename}
            {locked ? " · original protegido" : ""}
            {formatted !== null ? " · prévia formatada (somente leitura)" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !raw}
              onClick={toggleFormatted}
            >
              {formatted === null ? "Visualização formatada" : "Código bruto"}
            </Button>
            {locked && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy || formatted !== null}
                onClick={() => setEditing(true)}
              >
                <LockKeyhole className="size-3" />
                Editar uma cópia
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setRaw("");
                setSource(undefined);
                setReport(null);
                setFormatted(null);
                setLocked(false);
                setFilename("documento.xml");
              }}
            >
              Limpar editor
            </Button>
          </div>
        </div>
        <XmlEditor
          value={formatted ?? raw}
          onChange={(text) => {
            setRaw(text);
            setSource(undefined);
            setReport(null);
          }}
          readOnly={busy || locked || formatted !== null}
          issues={formatted === null ? report?.issues : []}
          focus={focus}
        />
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Ctrl/Cmd+F pesquisa no XML. Formatar exibe uma prévia: a validação usa
          o código bruto. Alterações em uma cópia podem invalidar a assinatura;
          o original importado permanece preservado.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Pacote instalado: PL 010f v1.04 · Regras locais 2026-10-23.1
          </p>
          <Button disabled={busy || !raw.trim()} onClick={validate}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanSearch className="size-4" />
            )}
            {busy ? "Processando…" : "Validar XML"}
          </Button>
        </div>
      </section>
      {report && (
        <ValidationResults
          report={report}
          onLine={(line) => {
            setFormatted(null);
            setFocus({ line, nonce: Date.now() });
          }}
        />
      )}
      <section className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-5 text-primary-text" />
            Histórico de validações
          </h2>
          <span className="text-xs text-muted-foreground">
            {history.total} registro(s)
          </span>
        </div>
        {!history.items.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Valide seu primeiro XML para acompanhar os resultados aqui.
          </p>
        ) : (
          <div className="relative mt-5 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="pb-3">Arquivo</th>
                  <th>Data</th>
                  <th>XSD</th>
                  <th>Erros / alertas</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="max-w-64 truncate py-4">
                      <button
                        disabled={busy}
                        className="text-primary-text underline"
                        onClick={() => openHistory(item.id)}
                      >
                        {item.filename}
                      </button>
                    </td>
                    <td>{dateTime(item.created_at)}</td>
                    <td>
                      {stateLabel[item.xsd_result as keyof typeof stateLabel] ||
                        item.xsd_result}
                    </td>
                    <td>
                      {item.error_count} / {item.warning_count}
                    </td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={`Excluir validação ${item.filename}`}
                        onClick={() => setDeleting(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-3 text-xs">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || history.page <= 1}
            onClick={() =>
              refreshHistory(history.page - 1).catch(() =>
                toast.error("Falha ao carregar histórico."),
              )
            }
          >
            Anterior
          </Button>
          <span>Página {history.page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || history.page * 20 >= history.total}
            onClick={() =>
              refreshHistory(history.page + 1).catch(() =>
                toast.error("Falha ao carregar histórico."),
              )
            }
          >
            Próxima
          </Button>
        </div>
      </section>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogTitle>Editar uma cópia do XML?</DialogTitle>
          <DialogDescription>
            Modificar conteúdo pode invalidar a assinatura digital. Você editará
            uma cópia no editor; o arquivo original armazenado não será
            alterado.
          </DialogDescription>
          <Button
            onClick={() => {
              setLocked(false);
              setSource(undefined);
              setReport(null);
              setEditing(false);
            }}
          >
            Entendi, editar cópia
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!busy && !open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Excluir validação?</DialogTitle>
          <DialogDescription>
            O relatório e a cópia privada do XML desta validação serão
            removidos. O documento importado em outro módulo permanece
            disponível.
          </DialogDescription>
          <Button variant="destructive" disabled={busy} onClick={remove}>
            {busy ? "Excluindo…" : "Excluir validação e original"}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent>
          <DialogTitle>Carregar documento importado</DialogTitle>
          <DialogDescription>
            Pesquise pela chave ou selecione entre os documentos recentes.
          </DialogDescription>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void findDocuments();
            }}
          >
            <Input
              aria-label="Chave para pesquisar documento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={44}
            />
            <Button disabled={finding}>Buscar</Button>
          </form>
          <div className="max-h-80 space-y-2 overflow-auto">
            {!documents.length && (
              <p className="py-5 text-sm text-muted-foreground">
                Nenhum documento encontrado.
              </p>
            )}
            {documents.map((doc) => (
              <button
                key={doc.id}
                disabled={busy}
                onClick={() => selectDocument(doc.id)}
                className="w-full rounded-lg border p-3 text-left hover:bg-muted"
              >
                <p className="text-sm">
                  {doc.model === "55" ? "NF-e" : "NFC-e"} {doc.number} · Série{" "}
                  {doc.series}
                </p>
                <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                  {doc.access_key}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
