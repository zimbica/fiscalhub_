// Receita Federal / Manual de cálculo DV CNPJ (docs/company-providers.md).
export function normalizeCnpj(value: string) { return value.toUpperCase().replace(/[./\s-]/g,''); }
export function isValidCnpj(value: string) {
  const cnpj=normalizeCnpj(value);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  function digit(base:string) {
    let total=0,weight=2;
    for(let i=base.length-1;i>=0;i--) { total+=(base.charCodeAt(i)-48)*weight;weight=weight===9 ? 2 : weight+1; }
    const remainder=total%11;return String(remainder<2 ? 0 : 11-remainder);
  }
  const first=digit(cnpj.slice(0,12));
  return cnpj.slice(12)===first+digit(cnpj.slice(0,12)+first);
}
export function formatCnpj(value:string) {
  const normalized=normalizeCnpj(value).replace(/[^A-Z0-9]/g,'').slice(0,14);
  return normalized.replace(/^(.{2})(.)/,'$1.$2').replace(/^(.{6})(.)/,'$1.$2').replace(/^(.{10})(.)/,'$1/$2').replace(/^(.{15})(.)/,'$1-$2');
}
