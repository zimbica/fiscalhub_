import { z } from "zod";
export const searchInput = z.object({
  query: z.string().trim().max(500).default(""),
  model: z.enum(["55", "65"]).nullable().default(null),
  favorites: z.boolean().default(false),
  page: z.number().int().min(1).max(10000).default(1),
  identify: z.boolean().default(false),
});
export type SearchInput = z.infer<typeof searchInput>;
export function normalizeMessage(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function extractCode(message: string) {
  const normalized = normalizeMessage(message);
  const codes = new Set<string>();
  if (/^\d{3,4}$/.test(normalized)) codes.add(normalized);
  for (const m of normalized.matchAll(
    /\b(?:rejeicao|cstat|codigo(?: da rejeicao)?)\s+(\d{3,4})\b/g,
  ))
    codes.add(m[1]);
  const initial = message.trim().match(/^(\d{3,4})\s*[-:–—]\s*\D/);
  if (initial) codes.add(initial[1]);
  return {
    code: codes.size === 1 ? [...codes][0] : null,
    ambiguous: codes.size > 1,
  };
}
export function historyLabel(input: SearchInput, code: string | null) {
  if (input.identify)
    return code
      ? `Mensagem ERP — código ${code}`
      : "Mensagem ERP — sem identificação";
  return input.query
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[e-mail]")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[CNPJ]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF]")
    .replace(/\b\d{11,44}\b/g, "[identificador]")
    .slice(0, 500);
}
