import { z } from "zod";
const text = z.string().trim().max(80).default("");
const date = z.union([z.literal(""), z.iso.date()]).default("");
const amount = z
  .string()
  .regex(/^(?:\d{1,13}(?:\.\d{1,2})?)?$/, "Valor inválido.")
  .default("");
export const documentFiltersSchema = z
  .object({
    number: text,
    key: text,
    issuer: text,
    recipient: text,
    customer: text,
    series: text,
    model: z.enum(["", "55", "65"]).default(""),
    start: date,
    end: date,
    dateBasis: z.enum(["issued", "authorized"]).default("issued"),
    cfop: text,
    ncm: text,
    taxSituation: text,
    status: z
      .enum(["", "authorized", "cancelled", "denied", "unconfirmed"])
      .default(""),
    uf: z
      .string()
      .regex(/^(?:[A-Z]{2})?$/)
      .default(""),
    product: text,
    payment: text,
    min: amount,
    max: amount,
    environment: z.enum(["", "1", "2"]).default(""),
    purpose: text,
    operationType: z.enum(["", "0", "1"]).default(""),
    needsReview: z.enum(["", "yes"]).default(""),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .superRefine((data, ctx) => {
    if (data.start && data.end && data.start > data.end)
      ctx.addIssue({
        code: "custom",
        message: "Data inicial posterior à final.",
        path: ["end"],
      });
  });
export type DocumentFilters = z.infer<typeof documentFiltersSchema>;
export const emptyFilters = documentFiltersSchema.parse({});
export const statusLabels = {
  unconfirmed: "Não confirmada",
  authorized: "Autorização identificada",
  cancelled: "Cancelamento identificado",
  denied: "Denegação identificada",
};
export const paymentLabels: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de crédito",
  "04": "Cartão de débito",
  "05": "Crédito loja",
  "10": "Vale alimentação",
  "11": "Vale refeição",
  "12": "Vale presente",
  "13": "Vale combustível",
  "15": "Boleto",
  "16": "Depósito",
  "17": "Pix dinâmico",
  "18": "Transferência / carteira digital",
  "19": "Fidelidade",
  "20": "Pix estático",
  "21": "Crédito em loja",
  "22": "Pagamento eletrônico não informado",
  "90": "Sem pagamento",
  "99": "Outros",
};
