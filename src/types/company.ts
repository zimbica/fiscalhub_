import { z } from 'zod';
import { isValidCnpj, normalizeCnpj } from '@/lib/cnpj';
export const cnpjInput=z.string().max(30).transform(normalizeCnpj).refine(isValidCnpj,'CNPJ inválido. Confira os caracteres e os dígitos verificadores.');
export const lookupSchema=z.object({cnpj:cnpjInput,refresh:z.boolean().default(false)});
export const sourceSchema=z.object({name:z.string(),url:z.url().refine(value=>['https:','http:'].includes(new URL(value).protocol),'Fonte precisa usar HTTP ou HTTPS.'),retrievedAt:z.iso.datetime()});
const cnaeSchema=z.object({code:z.string(),description:z.string().nullable()});
export const companyDataSchema=z.object({
  cnpj:cnpjInput,legalName:z.string().min(1),tradeName:z.string().nullable(),
  status:z.string().nullable(),statusDate:z.string().nullable(),openedAt:z.string().nullable(),
  primaryCnae:cnaeSchema,secondaryCnaes:z.array(cnaeSchema),legalNature:z.string().nullable(),
  simpleOption:z.boolean().nullable(),meiOption:z.boolean().nullable(),
  taxRegimes:z.array(z.object({year:z.number().int(),regime:z.string()})),
  address:z.object({street:z.string().nullable(),number:z.string().nullable(),complement:z.string().nullable(),district:z.string().nullable(),city:z.string().nullable(),uf:z.string().nullable(),postalCode:z.string().nullable()}),
  phones:z.array(z.string()),email:z.string().nullable(),source:sourceSchema,
  fieldSources:z.record(z.string(),sourceSchema),datasetUpdatedAt:z.string().nullable(),
});
export const registrationSchema=z.object({
  uf:z.string().regex(/^[A-Z]{2}$/),registration:z.string().min(1).max(30),
  status:z.enum(['active','suspended','closed','unfit','unknown']),
  verified:z.boolean(),source:sourceSchema,
  statusDescription:z.string().max(500).optional(),sourceUpdatedAt:z.iso.datetime().optional(),
});
export const ieResultSchema=z.object({
  outcome:z.enum(['verified','not_found','unavailable']),registrations:z.array(registrationSchema),
  message:z.string(),source:sourceSchema.nullable(),
}).superRefine((data,ctx)=>{
  if(data.outcome==='verified' && (!data.source || !data.registrations.length || data.registrations.some(item=>!item.verified))) ctx.addIssue({code:'custom',message:'Inscrições verificadas exigem evidência e fonte.'});
  if(data.outcome==='not_found' && (!data.source || data.registrations.length)) ctx.addIssue({code:'custom',message:'Ausência confirmada exige fonte e lista vazia.'});
  if(data.outcome==='unavailable' && data.registrations.some(item=>item.verified)) ctx.addIssue({code:'custom',message:'Consulta indisponível não confirma inscrições.'});
});
export type CompanyData=z.infer<typeof companyDataSchema>;
export type StateRegistrationResult=z.infer<typeof ieResultSchema>;
export type CompanyLookup={id:string;company:CompanyData;ie:StateRegistrationResult;queriedAt:string;expiresAt:string;fromCache:boolean;stale:boolean;warning?:string};
export type CompanyHistoryEntry={id:string;cnpj:string;legal_name:string;trade_name:string|null;registration_status:string|null;queried_at:string;expires_at:string;is_favorite:boolean};
export type CompanyHistory={items:CompanyHistoryEntry[];page:number;total:number;pageSize:number};
