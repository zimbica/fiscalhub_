import { afterEach, describe, expect, it, vi } from 'vitest';
import { CnpjaIeProvider, normalizeCnpjaIe } from '@/services/providers/cnpja';
import { companyProviders } from '@/services/providers';
import { ieResultSchema } from '@/types/company';

const cnpj = '37335118000180';
const now = new Date('2026-10-26T12:00:00Z');
const entry = { number: '123456789', state: 'SP', enabled: true, status: { id: 1, text: 'Sem restrição' } };
const payload = { taxId: cnpj, updated: now.toISOString(), registrations: [entry] };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('IE nacional via CNPJá', () => {
  it('consulta todas as UFs no CCC sem limitar à sede ou enviar certificado', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    const fetcher = vi.fn().mockResolvedValue(Response.json(payload)); vi.stubGlobal('fetch', fetcher);
    const result = await new CnpjaIeProvider('synthetic-key').lookup(cnpj);
    expect(result.outcome).toBe('verified');
    const [url, options] = fetcher.mock.calls[0];
    expect(new URL(url).searchParams.get('states')).toBe('ALL');
    expect(new URL(url).searchParams.get('source')).toBe('CCC');
    expect(new URL(url).searchParams.get('strategy')).toBe('CACHE_IF_FRESH');
    expect(options).toMatchObject({ headers: { Authorization: 'synthetic-key' }, redirect: 'error', cache: 'no-store' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain('synthetic-key');
  });
  it('preserva múltiplas IEs e distingue restrição de habilitação', () => {
    const result = normalizeCnpjaIe({ ...payload, registrations: [entry, { ...entry, state: 'MA', enabled: false, status: { id: 2, text: 'Bloqueado como destinatário na UF' } }] }, cnpj, now);
    expect(result.registrations).toHaveLength(2);
    expect(result.registrations[0]).toMatchObject({ status: 'active', sourceUpdatedAt: now.toISOString() });
    expect(result.registrations[1]).toMatchObject({ uf: 'MA', status: 'unknown', statusDescription: 'Não habilitada · Bloqueado como destinatário na UF' });
    expect(ieResultSchema.parse(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });
  it('não classifica bloqueio de destinatário como suspensão ou baixa', () => {
    const result = normalizeCnpjaIe({ ...payload, registrations: [{ ...entry, status: { id: 3, text: 'Vedada operação como destinatário na UF' } }] }, cnpj, now);
    expect(result.registrations[0].status).toBe('unknown');
    expect(result.registrations[0].statusDescription).toContain('Habilitada');
  });
  it.each([ { ...payload, stale: true }, { ...payload, updated: '2026-10-20T12:00:00Z' } ])('dados antigos não confirmam situação atual', data => {
    const result = normalizeCnpjaIe(data, cnpj, now);
    expect(result.outcome).toBe('unavailable');
    expect(result.registrations[0]).toMatchObject({ verified: false, status: 'unknown' });
  });
  it('lista vazia confirmada só vale no escopo da fonte', () => {
    expect(normalizeCnpjaIe({ ...payload, registrations: [] }, cnpj, now).outcome).toBe('not_found');
    expect(normalizeCnpjaIe({ ...payload, registrations: [], stale: true }, cnpj, now).outcome).toBe('unavailable');
  });
  it.each([
    { ...payload, taxId: '00000000000191' },
    { ...payload, updated: '2027-01-01T00:00:00Z' },
    { ...payload, registrations: undefined },
    { ...payload, registrations: [{ ...entry, state: 'ZZ' }] },
    { ...payload, registrations: [{ ...entry, enabled: 'true' }] },
  ])('recusa resposta sem evidência válida', data => expect(() => normalizeCnpjaIe(data, cnpj, now)).toThrow());
  it.each([401, 403, 404, 429, 402, 503])('HTTP %s não inventa ausência nem repete chamada', async status => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status })); vi.stubGlobal('fetch', fetcher);
    const result = await new CnpjaIeProvider('synthetic-key').lookup(cnpj);
    expect(result.outcome).toBe('unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
    if (status === 429 || status === 402) expect(result.message).toContain('cota');
  });
  it('trata timeout, HTML e excesso de tamanho', async () => {
    for (const response of [new Response('<html>error</html>'), Response.json({ value: 'x'.repeat(1_048_576) })]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      expect((await new CnpjaIeProvider('synthetic-key').lookup(cnpj)).outcome).toBe('unavailable');
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect((await new CnpjaIeProvider('synthetic-key').lookup(cnpj)).outcome).toBe('unavailable');
  });
  it('sem chave ou identificador suportado não faz requisição', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await new CnpjaIeProvider('').lookup(cnpj);
    await new CnpjaIeProvider('synthetic-key').lookup('12ABC34501DE35');
    await new CnpjaIeProvider('synthetic-key').lookup('invalid');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('factory seleciona conector com chave e preserva gateway explícito', () => {
    vi.stubEnv('CNPJA_API_KEY', 'synthetic-key'); vi.stubEnv('IE_PROVIDER_URL', ''); vi.stubEnv('IE_PROVIDER_TOKEN', '');
    expect(companyProviders().ie.name).toBe('cnpja-ccc');
    vi.stubEnv('IE_PROVIDER_URL', 'https://example.org/ie'); vi.stubEnv('IE_PROVIDER_TOKEN', 'fixture');
    expect(companyProviders().ie.name).toBe('authorized-gateway');
    vi.stubEnv('CNPJA_API_KEY', ''); vi.stubEnv('IE_PROVIDER_URL', ''); vi.stubEnv('IE_PROVIDER_TOKEN', '');
    expect(companyProviders().ie.name).toBe('official-manual');
  });
});
