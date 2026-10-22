export function officialIeLinks(uf:string|null) {
  const links=[{name:'Cadastro Centralizado de Contribuintes (CCC)',url:'https://dfe-portal.svrs.rs.gov.br/Nfe/Ccc',note:`Consulta manual${uf ? `: selecione ${uf}` : ''}. Pode exigir login gov.br ou outras credenciais.`}];
  if(uf==='RS')links.unshift({name:'Consulta cadastral oficial · SEFAZ-RS',url:'https://www.sefaz.rs.gov.br/consultas/contribuinte',note:'Consulta manual oficial por CNPJ ou Inscrição Estadual.'});
  return links;
}
