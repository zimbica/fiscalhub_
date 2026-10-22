export async function apiRequest<T = { message?: string; redirect?: string }>(url: string, data?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Não foi possível concluir a solicitação.');
  return payload.data as T;
}
