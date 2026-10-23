const uncertainResult = 'Não foi possível confirmar o resultado da solicitação. Verifique sua conexão e confira os dados ou o histórico antes de repetir a operação.';

function fallbackMessage(status: number) {
  if (status === 401) return 'Sua sessão não está disponível. Entre novamente para continuar.';
  if (status === 403) return 'Você não tem permissão para concluir esta solicitação.';
  if (status === 413) return 'O arquivo ou a solicitação excede o tamanho permitido.';
  if (status === 429) return 'Limite de solicitações atingido. Aguarde antes de tentar novamente.';
  return uncertainResult;
}

/** No automatic retry: a lost response does not mean a mutation was rolled back. */
export async function apiFetch<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(uncertainResult);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(fallbackMessage(response.status));
  }
  const envelope = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  if (!response.ok) {
    const error = envelope && 'error' in envelope ? envelope.error : null;
    const message = error && typeof error === 'object' && 'message' in error ? error.message : null;
    throw new Error(typeof message === 'string' && message.trim() ? message : fallbackMessage(response.status));
  }
  if (!envelope || !('data' in envelope)) throw new Error(uncertainResult);
  return envelope.data as T;
}

export function apiRequest<T = { message?: string; redirect?: string }>(url: string, data?: unknown, method = 'POST'): Promise<T> {
  return apiFetch<T>(url, { method, headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
}
