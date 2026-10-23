import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, apiRequest } from '@/lib/http-client';

afterEach(() => vi.unstubAllGlobals());
function response(body: string, status = 200) {
  const mock = vi.fn().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal('fetch', mock);
  return mock;
}
describe('respostas HTTP e recuperação segura', () => {
  it('envia JSON e retorna o envelope de dados', async () => {
    const mock = response('{"data":{"saved":true}}');
    await expect(apiRequest('/api/profile', { fullName: 'Pessoa' }, 'PATCH')).resolves.toEqual({ saved: true });
    expect(mock).toHaveBeenCalledWith('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"fullName":"Pessoa"}' });
  });
  it('preserva o envio XML sem serialização JSON', async () => {
    const mock = response('{"data":{"outcome":"imported"}}');
    const options = { method: 'POST', headers: { 'Content-Type': 'application/xml' }, body: '<NFe/>' };
    await apiFetch('/api/imports/test/files', options);
    expect(mock).toHaveBeenCalledWith('/api/imports/test/files', options);
  });
  it('preserva erros de negócio retornados pela API', async () => {
    response('{"error":{"message":"XML inválido."}}', 422);
    await expect(apiRequest('/api/validations')).rejects.toThrow('XML inválido.');
  });
  it('não repete uma mutação quando a conexão cai', async () => {
    const mock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', mock);
    await expect(apiRequest('/api/imports')).rejects.toThrow('confira os dados ou o histórico');
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it('não expõe HTML técnico de erro da hospedagem', async () => {
    response('<html>Internal proxy diagnostic</html>', 502);
    await expect(apiRequest('/api/profile')).rejects.toThrow('Não foi possível confirmar');
  });
  it.each([[401, 'Entre novamente'], [403, 'permissão'], [413, 'tamanho permitido'], [429, 'Aguarde']])('orienta o usuário em HTTP %s sem JSON', async (status, message) => {
    response('erro', status as number);
    await expect(apiRequest('/api/profile')).rejects.toThrow(message as string);
  });
  it.each(['null', '[]', '{}', '{"message":"ok"}', '{'])('não apresenta sucesso para envelope inválido: %s', async body => {
    response(body);
    await expect(apiRequest('/api/profile')).rejects.toThrow('Não foi possível confirmar');
  });
});
