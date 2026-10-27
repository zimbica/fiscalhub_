"use client";
import { Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyFilters,
  paymentLabels,
  type DocumentFilters,
} from "@/lib/documents/filters";
export function DocumentFilterForm({
  value,
  onChange,
  onApply,
  busy,
}: {
  value: DocumentFilters;
  onChange: (value: DocumentFilters) => void;
  onApply: (value: DocumentFilters) => void;
  busy: boolean;
}) {
  const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";
  const update = (name: keyof DocumentFilters, entry: string) =>
    onChange({ ...value, [name]: entry, page: 1 });
  const fields: [keyof DocumentFilters, string, string?][] = [
    ["number", "Número da nota"],
    ["key", "Chave de acesso"],
    ["issuer", "CNPJ / CPF emitente"],
    ["recipient", "CNPJ / CPF destinatário"],
    ["customer", "Nome do cliente"],
    ["series", "Série"],
    ["cfop", "CFOP"],
    ["ncm", "NCM"],
    ["taxSituation", "CST / CSOSN"],
    ["product", "Código ou descrição do produto"],
    ["uf", "UF destino (ou emitente se ausente)"],
    ["min", "Valor mínimo (R$)", "number"],
    ["max", "Valor máximo (R$)", "number"],
  ];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(value);
      }}
      className="rounded-md border bg-card p-4"
    >
      <div className="mb-4 flex items-center gap-2">
        <Filter className="size-4 text-primary-text" />
        <h2 className="text-sm font-semibold">Filtros da análise</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="filter-model">Modelo</Label>
          <select
            id="filter-model"
            className={selectClass}
            value={value.model}
            onChange={(e) => update("model", e.target.value)}
          >
            <option value="">NF-e e NFC-e</option>
            <option value="55">NF-e (55)</option>
            <option value="65">NFC-e (65)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-status">Situação identificada</Label>
          <select
            id="filter-status"
            className={selectClass}
            value={value.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="">Todas as situações</option>
            <option value="authorized">Autorização identificada</option>
            <option value="cancelled">Cancelamento identificado</option>
            <option value="denied">Denegação identificada</option>
            <option value="unconfirmed">Não confirmada</option>
          </select>
        </div>
        {(["start", "end"] as const).map((key) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`filter-${key}`}>
              {key === "start" ? "Data inicial" : "Data final"}
            </Label>
            <Input
              id={`filter-${key}`}
              type="date"
              value={value[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-primary-text">
          Mais filtros: empresas, produtos, tributos e valores
        </summary>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-dateBasis">Data de referência</Label>
            <select
              id="filter-dateBasis"
              className={selectClass}
              value={value.dateBasis}
              onChange={(e) => update("dateBasis", e.target.value)}
            >
              <option value="issued">Emissão</option>
              <option value="authorized">Autorização</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-environment">Ambiente</Label>
            <select
              id="filter-environment"
              className={selectClass}
              value={value.environment}
              onChange={(e) => update("environment", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="1">Produção</option>
              <option value="2">Homologação</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-purpose">Finalidade</Label>
            <select
              id="filter-purpose"
              className={selectClass}
              value={value.purpose}
              onChange={(e) => update("purpose", e.target.value)}
            >
              <option value="">Todas</option>
              <option value="1">Normal</option>
              <option value="2">Complementar</option>
              <option value="3">Ajuste</option>
              <option value="4">Devolução</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-operationType">Tipo de operação</Label>
            <select
              id="filter-operationType"
              className={selectClass}
              value={value.operationType}
              onChange={(e) => update("operationType", e.target.value)}
            >
              <option value="">Entrada e saída</option>
              <option value="0">Entrada</option>
              <option value="1">Saída</option>
            </select>
          </div>
          {fields.map(([key, title, type]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`filter-${key}`}>{title}</Label>
              <Input
                id={`filter-${key}`}
                type={type || "text"}
                step={type === "number" ? "0.01" : undefined}
                min={type === "number" ? "0" : undefined}
                maxLength={80}
                value={value[key]}
                onChange={(e) =>
                  update(
                    key,
                    key === "uf"
                      ? e.target.value.toUpperCase().slice(0, 2)
                      : ["issuer", "recipient", "key"].includes(key)
                        ? e.target.value.replace(/[.\s/-]/g, "").toUpperCase()
                        : e.target.value,
                  )
                }
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="filter-payment">Forma de pagamento</Label>
            <select
              id="filter-payment"
              className={selectClass}
              value={value.payment}
              onChange={(e) => update("payment", e.target.value)}
            >
              <option value="">Todas</option>
              {Object.entries(paymentLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {key} · {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-needsReview">Indicadores de análise</Label>
            <select
              id="filter-needsReview"
              className={selectClass}
              value={value.needsReview}
              onChange={(e) => update("needsReview", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="yes">Com alertas / inconsistências</option>
            </select>
          </div>
        </div>
      </details>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs leading-5 text-muted-foreground">
          Filtros de itens selecionam notas inteiras; os indicadores incluem
          todos os itens dessas notas. Datas usam o fuso de Brasília.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              onChange(emptyFilters);
              onApply(emptyFilters);
            }}
          >
            <RotateCcw />
            Limpar
          </Button>
          <Button type="submit" disabled={busy}>
            <Search />
            Aplicar filtros
          </Button>
        </div>
      </div>
    </form>
  );
}
