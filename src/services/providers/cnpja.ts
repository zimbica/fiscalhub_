import 'server-only';
import { z } from 'zod';
import { isValidCnpj } from '@/lib/cnpj';
import { ieResultSchema, type StateRegistrationResult } from '@/types/company';
import type { StateRegistrationProvider } from './types';
import { unavailableIe } from './state-registration';

const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SP','SE','TO'] as const;
const responseSchema = z.object({
  taxId: z.string(), updated: z.iso.datetime({ offset: true }), stale: z.boolean().optional(),
  registrations: z.array(z.object({
    number: z.string().regex(/^\d{8,14}$/), state: z.enum(ufs), enabled: z.boolean(),
    status: z.object({ id: z.number().int(), text: z.string().trim().min(1).max(300) }),
  })).max(500),
});
const endpoint = 'https://api.cnpja.com/ccc';
const sourceUrl = 'https://cnpja.com/api';

// Contract reviewed against the provider's official SDK 1.9.1 and API guide.
export function normalizeCnpjaIe(input: unknown, cnpj: string, now = new Date()): StateRegistrationResult {
  const data = responseSchema.parse(input);
  if (data.taxId !== cnpj) throw new Error('CNPJ divergente na resposta.');
  const age = now.getTime() - Date.parse(data.updated);
  if (age < -300_000) throw new Error('Data futura na resposta.');
  const stale = data.stale === true || age > 86_400_000;
  const source = { name: 'CNPJá · Cadastro Centralizado de Contribuintes', url: sourceUrl, retrievedAt: now.toISOString() };
  const registrations = data.registrations.map(item => ({
    uf: item.state, registration: item.number,
    // Restriction codes do not mean "suspended", "closed" or "unfit".
    status: !stale && item.enabled && item.status.id === 1 ? 'active' as const : 'unknown' as const,
    statusDescription: `${item.enabled ? 'Habilitada' : 'Não habilitada'} · ${item.status.text}`,
    sourceUpdatedAt: new Date(data.updated).toISOString(), verified: !stale, source,
  }));
  return ieResultSchema.parse({
    outcome: stale ? 'unavailable' : registrations.length ? 'verified' : 'not_found', registrations, source,
    message: stale
      ? 'O provedor retornou dados antigos. Os números são referências históricas; a situação atual não foi confirmada.'
      : 'Consulta nacional ao CCC por intermédio do CNPJá, abrangendo as UFs disponíveis na fonte. Não substitui certidão oficial nem garante disponibilidade de cada cadastro estadual.',
  });
}

export class CnpjaIeProvider implements StateRegistrationProvider {
  name = 'cnpja-ccc';
  constructor(private key: string) {}
  async lookup(cnpj: string): Promise<StateRegistrationResult> {
    if (!isValidCnpj(cnpj) || !/^[0-9]{14}$/.test(cnpj)) return unavailableIe('Este provedor de IE aceita apenas CNPJ numérico válido.');
    if (!this.key.trim()) return unavailableIe('A integração gratuita de IE aguarda a chave do CNPJá.');
    try {
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ taxId: cnpj, states: 'ALL', source: 'CCC', strategy: 'CACHE_IF_FRESH', maxAge: '1' }).toString();
      const response = await fetch(url, {
        headers: { Authorization: this.key, Accept: 'application/json' },
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429 || response.status === 402) return unavailableIe('A cota de IE ou o limite de consultas do CNPJá foi atingido. Aguarde a renovação da cota gratuita; o FiscalHub não compra créditos automaticamente.');
        if (response.status === 401 || response.status === 403) return unavailableIe('A chave do CNPJá não foi aceita ou não tem acesso à consulta de IE.');
        // 404 may mean a cache miss: it never proves absence of an IE.
        return unavailableIe('O CNPJá não conseguiu confirmar as inscrições nesta consulta. Isso não significa que a empresa não tenha IE.');
      }
      if (!response.headers.get('content-type')?.includes('application/json')) { await response.body?.cancel(); throw new Error('Formato inválido.'); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Resposta vazia.');
      let size = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1_048_576) { await reader.cancel(); throw new Error('Resposta excessiva.'); }
        chunks.push(value);
      }
      return normalizeCnpjaIe(JSON.parse(Buffer.concat(chunks).toString('utf8')), cnpj);
    } catch {
      return unavailableIe('Não foi possível verificar a IE pelo CNPJá. A consulta de CNPJ continua disponível; tente atualizar mais tarde.');
    }
  }
}
