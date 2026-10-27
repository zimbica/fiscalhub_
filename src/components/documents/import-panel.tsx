"use client";
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Loader2,
  Pause,
  FolderOpen,
  RefreshCw,
  Trash2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiFetch, apiRequest } from "@/lib/http-client";
import { dateTime } from "@/lib/format";
import type { Database } from "@/types/database";
import type { ImportFileResult } from "@/types/fiscal";
type Job = Database["public"]["Tables"]["xml_imports"]["Row"];
type History = { items: Job[]; page: number; total: number };
type Detail = {
  job: Job;
  files: {
    id: string;
    filename: string;
    outcome: string;
    message: string | null;
    document_id: string | null;
    original_path: string | null;
  }[];
  page: number;
  total: number;
};
const outcomes: Record<string, string> = {
  imported: "Importado",
  updated: "Evidência atualizada",
  duplicate: "Duplicado",
  invalid: "Inválido",
  conflict: "Conteúdo divergente",
};
const states: Record<string, string> = {
  pending: "Aguardando arquivos",
  processing: "Em processamento / retomável",
  completed: "Concluído",
  interrupted: "Interrompido",
  failed: "Falhou",
  deleting: "Exclusão pendente",
};
export function ImportPanel({
  initial,
  onChanged,
}: {
  initial: History;
  onChanged: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]),
    [name, setName] = useState(""),
    [history, setHistory] = useState(initial),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState({
      count: 0,
      last: "",
      errors: 0,
      duplicates: 0,
    }),
    [resume, setResume] = useState<Job | null>(null),
    [detail, setDetail] = useState<Detail | null>(null),
    [removing, setRemoving] = useState<Job | null>(null),
    [deleting, setDeleting] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    stop = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop.current?.();
    };
  }, []);
  async function refresh(page = history.page) {
    setHistory(
      await apiRequest<History>(`/api/imports?page=${page}`, undefined, "GET"),
    );
  }
  async function show(job: Job, page = 1) {
    try {
      setDetail(
        await apiRequest<Detail>(
          `/api/imports/${job.id}?page=${page}`,
          undefined,
          "GET",
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir lote.");
    }
  }
  async function run() {
    if (!files.length) return;
    setBusy(true);
    setProgress({
      count: 0,
      last: "Preparando arquivos...",
      errors: 0,
      duplicates: 0,
    });
    let jobId = resume?.id;
    let examined = 0;
    try {
      if (!jobId) {
        const job = await apiRequest<Job>("/api/imports", {
          name:
            name.trim() ||
            `Importação ${new Date().toLocaleDateString("pt-BR")}`,
        });
        jobId = job.id;
      }
      await apiRequest(
        `/api/imports/${jobId}`,
        { status: "processing" },
        "PATCH",
      );
      if (!mounted.current)
        throw new Error("Importação interrompida ao sair da página.");
      const id = jobId;
      const worker = new Worker(
        new URL("../../workers/import.worker.ts", import.meta.url),
        { type: "module" },
      );
      let paused = false,
        uploading = false;
      const completed = await new Promise<boolean>((resolve, reject) => {
        stop.current = () => {
          paused = true;
          if (!uploading) {
            worker.terminate();
            resolve(false);
          }
        };
        worker.onerror = () => {
          worker.terminate();
          reject(
            new Error("Não foi possível processar os arquivos no navegador."),
          );
        };
        worker.onmessage = async ({ data }) => {
          if (data.type === "fatal") {
            worker.terminate();
            reject(new Error(data.error));
            return;
          }
          if (data.type === "done") {
            worker.terminate();
            if (data.ignored)
              toast.info(`${data.ignored} arquivo(s) não XML ignorado(s).`);
            resolve(true);
            return;
          }
          uploading = true;
          const entryStarted = performance.now();
          try {
            let result: ImportFileResult;
            if (data.error)
              result = await apiRequest(`/api/imports/${id}/rejections`, {
                name: data.name,
                message: String(data.error).slice(0, 500),
              });
            else {
              result = await apiFetch<ImportFileResult>(
                `/api/imports/${id}/files?${new URLSearchParams({ name: data.name })}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/xml" },
                  body: data.bytes,
                },
              );
            }
            examined++;
            setProgress((previous) => ({
              count: examined,
              last: data.name,
              errors:
                previous.errors +
                (["invalid", "conflict"].includes(result.outcome) ? 1 : 0),
              duplicates:
                previous.duplicates +
                (result.outcome === "duplicate" || result.replayed ? 1 : 0),
            }));
            uploading = false;
            if (paused) {
              worker.terminate();
              resolve(false);
            } else {
              await new Promise((resolve) =>
                setTimeout(
                  resolve,
                  Math.max(0, 125 - (performance.now() - entryStarted)),
                ),
              );
              worker.postMessage({ type: "ack" });
            }
          } catch (error) {
            worker.terminate();
            reject(error);
          }
        };
        worker.postMessage({ type: "start", files });
      });
      await apiRequest(
        `/api/imports/${id}`,
        {
          status: completed ? "completed" : "interrupted",
          ...(completed ? { total: examined } : {}),
        },
        "PATCH",
      );
      toast.success(
        completed
          ? "Lote processado. Confira o resultado de cada arquivo."
          : "Importação pausada. Você pode selecionar os arquivos e retomar.",
      );
      setFiles([]);
      setResume(null);
      if (input.current) input.current.value = "";
    } catch (error) {
      if (jobId)
        await apiRequest(
          `/api/imports/${jobId}`,
          { status: "interrupted" },
          "PATCH",
        ).catch(() => {});
      toast.error(
        error instanceof Error ? error.message : "Importação interrompida.",
      );
    } finally {
      stop.current = null;
      setBusy(false);
      await refresh(1).catch(() => {});
      onChanged();
    }
  }
  async function remove() {
    if (!removing) return;
    setDeleting(true);
    try {
      for (;;) {
        const result = await apiRequest<{ done: boolean }>(
          `/api/imports/${removing.id}`,
          undefined,
          "DELETE",
        );
        if (result.done) break;
      }
      setRemoving(null);
      await refresh(1);
      onChanged();
      toast.success("Importação e arquivos associados removidos.");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Exclusão interrompida. Tente novamente.",
      );
    } finally {
      setDeleting(false);
    }
  }
  return (
    <section id="importar" className="scroll-mt-24 space-y-5">
      <div className="rounded-md border bg-card p-4 sm:p-4">
        <div className="flex items-start gap-3">
          <span className="text-muted-foreground">
            <UploadCloud className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold">Importar documentos fiscais</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="import-name">Nome do lote</Label>
            <Input
              id="import-name"
              value={resume ? resume.name : name}
              disabled={busy || Boolean(resume)}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
            />
          </div>
          <div className="flex items-end gap-2">
            {resume && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setResume(null)}
              >
                Novo lote
              </Button>
            )}
            <Button disabled={busy || !files.length} onClick={run}>
              {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />}
              {resume ? "Retomar lote" : "Iniciar importação"}
            </Button>
          </div>
        </div>
        <label
          className={`mt-4 flex cursor-pointer flex-wrap items-center gap-3 rounded-md border border-dashed px-4 py-3 transition-colors hover:border-primary/50 ${busy ? "pointer-events-none opacity-60" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) setFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <FolderOpen className="size-4 text-primary-text" />
          <span className="text-xs font-medium">Selecionar XML ou ZIP</span>
          <span className="text-xs text-muted-foreground">
            XML até 2 MiB · ZIP até 32 MiB · até 10.000 entradas por lote
          </span>
          <input
            ref={input}
            type="file"
            accept=".xml,.zip"
            multiple
            disabled={busy}
            aria-label="Selecionar XMLs ou ZIPs"
            className="sr-only"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </label>
        {files.length > 0 && (
          <p className="mt-3 break-words text-xs text-muted-foreground">
            {files.length} arquivo(s) selecionado(s):{" "}
            {files
              .slice(0, 3)
              .map((f) => f.name)
              .join(", ")}
            {files.length > 3 ? "…" : ""}
          </p>
        )}
        {(busy || progress.count > 0) && (
          <div role="status" className="mt-4 rounded-lg bg-muted/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {busy && (
                  <Loader2 className="mr-2 inline size-4 animate-spin" />
                )}
                {progress.count} arquivo(s) examinados · {progress.duplicates}{" "}
                duplicados/reenvios · {progress.errors} com problemas
              </span>
              {busy && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => stop.current?.()}
                >
                  <Pause />
                  Pausar
                </Button>
              )}
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {progress.last}
            </p>
          </div>
        )}
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          Limite descompactado: 128 MiB. Retomada exige os mesmos arquivos. A
          importação não valida XSD, assinatura ou situação online na SEFAZ.
        </p>
      </div>
      <div className="overflow-hidden rounded-md border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold">Histórico de importações</h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              refresh().catch(() =>
                toast.error("Falha ao atualizar histórico."),
              )
            }
          >
            <RefreshCw className="size-4" />
            Atualizar
          </Button>
        </div>
        {history.items.length ? (
          <div
            tabIndex={0}
            role="region"
            aria-label="Tabela com rolagem horizontal"
            className="overflow-x-auto"
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {[
                    "Lote",
                    "Situação",
                    "Processados",
                    "Duplicados",
                    "Problemas",
                    "Ações",
                  ].map((t) => (
                    <th key={t} className="px-5 py-3 font-medium">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.items.map((job) => (
                  <tr key={job.id}>
                    <td className="min-w-48 px-5 py-4">
                      <button
                        className="font-medium text-primary-text"
                        onClick={() => show(job)}
                      >
                        {job.name}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {dateTime(job.created_at)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs">{states[job.status]}</td>
                    <td className="px-5 py-4">{job.processed_files}</td>
                    <td className="px-5 py-4">{job.duplicate_files}</td>
                    <td className="px-5 py-4">{job.error_count}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {job.status !== "deleting" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              setResume(job);
                              document
                                .getElementById("importar")
                                ?.scrollIntoView({ behavior: "smooth" });
                              input.current?.click();
                            }}
                          >
                            Retomar
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busy}
                          aria-label={`Excluir lote ${job.name}`}
                          onClick={() => setRemoving(job)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma importação registrada.
          </p>
        )}
        <div className="flex justify-between border-t p-4 text-xs text-muted-foreground">
          <span>
            Página {history.page} · {history.total} lote(s)
          </span>
          <div className="flex gap-2">
            {history.page > 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => refresh(history.page - 1)}
              >
                Anterior
              </Button>
            )}
            {history.page * 10 < history.total && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => refresh(history.page + 1)}
              >
                Próxima
              </Button>
            )}
          </div>
        </div>
      </div>
      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open && !deleting) setRemoving(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Excluir importação?</DialogTitle>
          <DialogDescription>
            Os arquivos deste lote serão apagados. Notas sem outra origem
            importada também serão removidas; as situações serão recalculadas
            com as evidências restantes.
          </DialogDescription>
          <Button variant="destructive" disabled={deleting} onClick={remove}>
            {deleting && <Loader2 className="animate-spin" />}Excluir lote e
            arquivos
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle>{detail?.job.name}</DialogTitle>
          <DialogDescription>
            Resultado individual dos arquivos e originais disponíveis.
          </DialogDescription>
          <div className="space-y-3">
            {detail?.files.map((file) => (
              <div key={file.id} className="rounded-lg border p-3 text-sm">
                <div className="flex gap-2">
                  <FileText className="size-4 shrink-0 text-primary-text" />
                  <span className="break-all font-medium">{file.filename}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {outcomes[file.outcome]}
                  {file.message ? ` · ${file.message}` : ""}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-primary-text">
                  {file.document_id && (
                    <Link href={`/documentos/${file.document_id}`}>
                      Abrir nota
                    </Link>
                  )}
                  {file.original_path && (
                    <a href={`/api/import-files/${file.id}`}>
                      Baixar XML original
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            {detail && detail.page > 1 && (
              <Button
                variant="outline"
                onClick={() => show(detail.job, detail.page - 1)}
              >
                Anterior
              </Button>
            )}
            {detail && detail.page * 25 < detail.total && (
              <Button
                variant="outline"
                onClick={() => show(detail.job, detail.page + 1)}
              >
                Próxima
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
