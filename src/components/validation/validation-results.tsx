"use client";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  ArrowDownToLine,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ValidationReport, ValidationState } from "@/types/validation";
export const stateLabel: Record<ValidationState, string> = {
  passed: "Verificações aprovadas",
  failed: "Inconsistências encontradas",
  not_verified: "Não verificado",
};
export function ValidationResults({
  report,
  onLine,
}: {
  report: ValidationReport;
  onLine: (line: number) => void;
}) {
  const stages = [
    ["Estrutura XML", report.structure],
    ["Schema XSD", report.xsd],
    ["Regras locais", report.rules],
  ] as const;
  return (
    <section className="space-y-5" aria-label="Resultado da validação">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {report.errors
                ? "Inconsistências identificadas"
                : report.xsd === "passed"
                  ? "Sem erros nas verificações executadas"
                  : "Validação incompleta"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.documentType || "Tipo não identificado"} · Leiaute{" "}
              {report.layoutVersion || "não identificado"}
              {report.model ? ` · Modelo ${report.model}` : ""}
            </p>
          </div>
          {report.id && (
            <a
              href={`/api/validations/${report.id}?format=json`}
              className="inline-flex items-center gap-2 text-sm text-primary"
            >
              <ArrowDownToLine className="size-4" />
              Baixar relatório JSON
            </a>
          )}
        </div>
        <p className="mt-4 break-all font-mono text-xs">
          {report.accessKey || "Chave de acesso não identificada"}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {stages.map(([title, status]) => (
            <div key={title} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{title}</p>
              <p
                className={`mt-2 flex items-center gap-2 text-sm font-medium ${status === "passed" ? "text-emerald-600" : status === "failed" ? "text-red-600" : "text-muted-foreground"}`}
              >
                {status === "passed" ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <AlertTriangle className="size-4" />
                )}
                {stateLabel[status]}
              </p>
            </div>
          ))}
        </div>
        <p data-testid="validation-counts" className="mt-4 text-sm">
          {report.errors} erro(s) · {report.warnings} alerta(s) ·{" "}
          {report.checksRun} verificações executadas
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {report.schema?.title || "Nenhum pacote XSD aplicável instalado"} ·{" "}
          {report.engine}
        </p>
        {report.schema && (
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer">
              Versão, arquivo e integridade do schema
            </summary>
            <p className="mt-2 break-all">
              {report.schema.version} · {report.schema.entry}
              <br />
              SHA-256 do conjunto: {report.schema.bundleHash}
            </p>
          </details>
        )}
      </div>
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="text-sm font-medium">
          Validação local não comprova autorização pela SEFAZ.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
          {report.notVerified.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </div>
      {report.xsd === "failed" && (
        <Link
          href="/rejeicoes/215"
          className="inline-block text-sm text-primary underline"
        >
          Consultar orientação sobre falha de schema (215)
        </Link>
      )}
      {report.truncated && (
        <p role="alert" className="text-sm text-amber-700">
          Relatório limitado às primeiras 200 ocorrências. Corrija os primeiros
          problemas e valide novamente.
        </p>
      )}
      <div className="space-y-3">
        {report.issues.map((issue, index) => (
          <article key={index} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p
                className={`text-xs font-semibold ${issue.severity === "error" ? "text-red-600" : issue.severity === "warning" ? "text-amber-700" : "text-primary"}`}
              >
                {issue.level === "xsd"
                  ? "Schema XSD"
                  : issue.level === "structure"
                    ? "Estrutura XML"
                    : "Regra local"}{" "}
                · {issue.ruleId}
                {issue.rejectionCode
                  ? ` · Rejeição ${issue.rejectionCode}`
                  : ""}
              </p>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Copiar inconsistência ${index + 1}`}
                onClick={() =>
                  navigator.clipboard
                    .writeText(
                      [
                        issue.message,
                        issue.xpath,
                        issue.suggestion,
                        issue.source.url,
                      ]
                        .filter(Boolean)
                        .join("\n"),
                    )
                    .then(() => toast.success("Descrição copiada."))
                    .catch(() => toast.error("Não foi possível copiar."))
                }
              >
                <Copy className="size-3" />
                Copiar
              </Button>
            </div>
            <p className="mt-2 break-words text-sm font-medium">
              {issue.message}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {issue.tag && (
                <span>
                  Tag: <code>{issue.tag}</code>
                </span>
              )}
              {issue.line && (
                <button
                  className="text-primary underline"
                  onClick={() => onLine(issue.line!)}
                >
                  Ir à linha {issue.line}
                  {issue.column ? `, coluna ${issue.column}` : ""}
                </button>
              )}
            </div>
            {issue.xpath && (
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {issue.xpath}
              </p>
            )}
            {issue.found && (
              <p className="mt-2 break-all text-xs">
                Encontrado: {issue.found}
              </p>
            )}
            {issue.expected && (
              <p className="mt-2 break-all text-xs">
                Esperado: {issue.expected}
              </p>
            )}
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {issue.reason}
            </p>
            <p className="mt-2 text-sm leading-6">{issue.suggestion}</p>
            <a
              href={issue.source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs text-primary underline"
            >
              {issue.source.title} · {issue.source.version}
            </a>
            {issue.rawMessage && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs">
                  Mensagem original do validador
                </summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs">
                  {issue.rawMessage}
                </pre>
              </details>
            )}
          </article>
        ))}
      </div>
      {!!report.checks.length && (
        <details className="rounded-xl border bg-card p-5">
          <summary className="cursor-pointer text-sm font-medium">
            Regras executadas e verificações não aplicadas
          </summary>
          <ul className="mt-4 space-y-3">
            {report.checks.map((check) => (
              <li key={check.id} className="text-xs">
                <strong>{check.title}</strong> — {stateLabel[check.status]}
                {check.reason && (
                  <p className="mt-1 text-muted-foreground">{check.reason}</p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
