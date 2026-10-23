import { URL } from "node:url";
import { z } from "zod";
const https = z
  .string()
  .url()
  .refine((s) => {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Fonte deve usar HTTPS sem credenciais.");
const text = z.string().trim().min(1).max(1500);
const code = z.string().regex(/^\d{3,4}$/);
export const catalogSchema = z
  .object({
    revision: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
    reviewedAt: z.iso.datetime(),
    entries: z
      .array(
        z.object({
          code,
          title: text,
          description: text,
          explanation: text,
          models: z.array(z.enum(["55", "65"])).min(1),
          causes: z.array(text).min(1),
          corrections: z.array(text).min(1),
          xml_fields: z.array(text),
          example: z.string().max(4000).nullable(),
          scope_note: text,
          related_codes: z.array(code),
          aliases: z.array(text),
          sources: z
            .array(
              z.object({
                title: text,
                url: https,
                publisher: text,
                is_official: z.boolean(),
              }),
            )
            .min(2)
            .refine(
              (s) =>
                s.some((x) => x.is_official) &&
                s.some((x) => new URL(x.url).hostname === "oobj.com.br"),
              "Inclua fonte oficial e Oobj.",
            ),
        }),
      )
      .min(1)
      .max(10000),
  })
  .superRefine((data, ctx) => {
    const codes = new Set();
    for (const e of data.entries) {
      if (codes.has(e.code))
        ctx.addIssue({
          code: "custom",
          message: "Código duplicado: " + e.code,
        });
      codes.add(e.code);
    }
    for (const e of data.entries)
      for (const r of e.related_codes)
        if (!codes.has(r) || r === e.code)
          ctx.addIssue({
            code: "custom",
            message: "Relacionamento inválido: " + e.code + " → " + r,
          });
  });
export function catalogSql(input) {
  const data = catalogSchema.parse(input);
  const literal = (s) => "'" + s.replaceAll("'", "''") + "'";
  const entries = data.entries.map((e) => ({
    ...e,
    revision: data.revision,
    reviewed_at: data.reviewedAt,
  }));
  return `-- Catálogo editorial ${data.revision}. Resumos próprios; fontes revisadas.\nbegin;\ndo $catalog$\ndeclare item jsonb; source jsonb; target uuid;\nbegin\n for item in select value from jsonb_array_elements(${literal(JSON.stringify(entries))}::jsonb) loop\n insert into public.rejection_catalog(code,title,description,explanation,models,causes,corrections,xml_fields,example,reviewed_at,revision,scope_note,related_codes,aliases)\n values(item->>'code',item->>'title',item->>'description',item->>'explanation',array(select jsonb_array_elements_text(item->'models')),item->'causes',item->'corrections',array(select jsonb_array_elements_text(item->'xml_fields')),item->>'example',(item->>'reviewed_at')::timestamptz,item->>'revision',item->>'scope_note',array(select jsonb_array_elements_text(item->'related_codes')),array(select jsonb_array_elements_text(item->'aliases')))\n on conflict(code) do update set title=excluded.title,description=excluded.description,explanation=excluded.explanation,models=excluded.models,causes=excluded.causes,corrections=excluded.corrections,xml_fields=excluded.xml_fields,example=excluded.example,reviewed_at=excluded.reviewed_at,revision=excluded.revision,scope_note=excluded.scope_note,related_codes=excluded.related_codes,aliases=excluded.aliases\n returning id into target;\n delete from public.rejection_sources where rejection_id=target;\n for source in select value from jsonb_array_elements(item->'sources') loop\n insert into public.rejection_sources(rejection_id,title,url,publisher,is_official,reviewed_at) values(target,source->>'title',source->>'url',source->>'publisher',(source->>'is_official')::boolean,(item->>'reviewed_at')::timestamptz);\n end loop;\n end loop;\nend $catalog$;\ncommit;\n`;
}
