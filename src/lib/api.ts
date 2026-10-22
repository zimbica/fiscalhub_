import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appUrl } from '@/lib/env';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_FAILED', public retryAfter?: number) { super(message); }
}

export function assertSameOrigin(request: Request) {
  if (request.headers.get('origin') !== appUrl()) throw new ApiError(403, 'Origem da solicitação não permitida.', 'INVALID_ORIGIN');
}

export async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415, 'Envie os dados em JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Dados não informados.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 8192) { await reader.cancel(); throw new ApiError(413, 'Solicitação muito grande.'); }
    chunks.push(value);
  }
  try { return schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch (error) {
    if (error instanceof z.ZodError) throw new ApiError(400, error.issues[0].message, 'VALIDATION_ERROR');
    throw new ApiError(400, 'JSON inválido.', 'INVALID_JSON');
  }
}

export function success(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function failure(error: unknown) {
  const known = error instanceof ApiError;
  if (!known) console.error('FiscalHub: falha interna em solicitação.');
  return NextResponse.json({ error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'Não foi possível concluir. Tente novamente em instantes.' } }, {
    status: known ? error.status : 500,
    headers: { 'Cache-Control': 'private, no-store', ...(known && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}) },
  });
}
