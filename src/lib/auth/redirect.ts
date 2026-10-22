const allowedDestinations = new Set(['/painel', '/nova-senha', '/configuracoes']);
export function safeRedirect(value: string | null | undefined) {
  return value && allowedDestinations.has(value) ? value : '/painel';
}
