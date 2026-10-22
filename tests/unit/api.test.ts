import { describe,it,expect,vi,afterEach } from 'vitest';
import { z } from 'zod';
import { assertSameOrigin, readBody, ApiError, failure } from '@/lib/api';
afterEach(() => vi.unstubAllEnvs());
describe('proteção das rotas HTTP',() => {
  it('rejeita origem externa mesmo com host parecido',() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL','https://fiscal.example');
    expect(() => assertSameOrigin(new Request('https://fiscal.example/api',{headers:{origin:'https://fiscal.example.evil'}}))).toThrow(ApiError);
  });
  it('rejeita origem ausente',() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL','https://fiscal.example');
    expect(() => assertSameOrigin(new Request('https://fiscal.example/api'))).toThrow(ApiError);
  });
  it('aceita mesma origem',() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL','https://fiscal.example');
    expect(() => assertSameOrigin(new Request('https://fiscal.example/api',{headers:{origin:'https://fiscal.example'}}))).not.toThrow();
  });
  it('rejeita JSON malformado',async () => {
    const request = new Request('http://localhost',{method:'POST',headers:{'content-type':'application/json'},body:'{oops'});
    await expect(readBody(request,z.object({name:z.string()}))).rejects.toMatchObject({status:400});
  });
  it('limita bytes reais mesmo sem Content-Length',async () => {
    const request = new Request('http://localhost',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'a'.repeat(9000)})});
    await expect(readBody(request,z.object({name:z.string()}))).rejects.toMatchObject({status:413});
  });
  it('não expõe detalhes internos',async () => {
    const spy=vi.spyOn(console,'error').mockImplementation(() => {});
    const response=failure(new Error('secret-key-must-never-leak'));
    expect(await response.text()).not.toContain('secret-key');
    expect(response.status).toBe(500); spy.mockRestore();
  });
});
