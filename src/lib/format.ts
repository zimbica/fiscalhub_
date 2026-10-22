export function money(value: string) {
  // PostgreSQL returns the aggregate as a decimal string. Formatting does not change its precision.
  const [integer, fraction = '00'] = value.split('.');
  return `R$ ${BigInt(integer || '0').toLocaleString('pt-BR')},${fraction.padEnd(2, '0').slice(0,2)}`;
}
export function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}
