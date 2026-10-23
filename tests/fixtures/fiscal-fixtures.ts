// Synthetic documents for parser/integration tests. Not signed, not SEFAZ authorized,
// and not fixtures asserting XSD validity. See tests/fixtures/xml/README.md.
export function fixtureKey(model = "55", number = 1) {
  const base = `35261012345678000195${model}001${String(number).padStart(9, "0")}112345678`;
  let sum = 0,
    weight = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += Number(base[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const r = sum % 11;
  return base + String(r < 2 ? 0 : 11 - r);
}
export function fixtureNfe(
  options: {
    model?: string;
    number?: number;
    authorized?: boolean;
    purpose?: string;
    environment?: string;
    total?: string;
    reform?: boolean;
  } = {},
) {
  const {
    model = "55",
    number = 1,
    authorized = true,
    purpose = "1",
    environment = "2",
    total = "0.30",
    reform = false,
  } = options;
  const key = fixtureKey(model, number);
  const items = ["0.10", "0.20"]
    .map(
      (price, index) =>
        `<det nItem="${index + 1}"><prod><cProd>TESTE-${index + 1}</cProd><cEAN>SEM GTIN</cEAN><xProd>Produto sintético ${index + 1}</xProd><NCM>19059090</NCM><CEST>1706200</CEST><CFOP>5102</CFOP><uCom>UN</uCom><qCom>1.0000</qCom><vUnCom>${price}</vUnCom><vProd>${price}</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>1.0000</qTrib><vUnTrib>${price}</vUnTrib><vDesc>0.00</vDesc><indTot>1</indTot></prod><imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS><PIS><PISNT><CST>07</CST></PISNT></PIS><COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>${reform ? "<IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib><gIBSCBS><vBC>0.10</vBC><gIBSUF><pIBSUF>0.1000</pIBSUF><vIBSUF>0.01</vIBSUF></gIBSUF><gIBSMun><pIBSMun>0.0000</pIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun><gCBS><pCBS>0.9000</pCBS><vCBS>0.02</vCBS></gCBS></gIBSCBS></IBSCBS>" : ""}</imposto></det>`,
    )
    .join("");
  const nfe = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${key}" versao="4.00"><ide><cUF>35</cUF><cNF>12345678</cNF><natOp>DOCUMENTO SINTÉTICO PARA TESTE</natOp><mod>${model}</mod><serie>1</serie><nNF>${number}</nNF><dhEmi>2026-10-20T10:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>3550308</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${key[43]}</cDV><tpAmb>${environment}</tpAmb><finNFe>${purpose}</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>fixture</verProc></ide><emit><CNPJ>12345678000195</CNPJ><xNome>EMITENTE SINTÉTICO</xNome><xFant>FIXTURE</xFant><enderEmit><xLgr>Rua de Teste</xLgr><nro>1</nro><xBairro>Centro</xBairro><cMun>3550308</cMun><xMun>SÃO PAULO</xMun><UF>SP</UF><CEP>01001000</CEP></enderEmit><IE>110042490114</IE><CRT>1</CRT></emit><dest><CPF>11144477735</CPF><xNome>DESTINATÁRIO SINTÉTICO</xNome><enderDest><xLgr>Rua de Teste</xLgr><nro>2</nro><xBairro>Centro</xBairro><cMun>3550308</cMun><xMun>SÃO PAULO</xMun><UF>SP</UF></enderDest><indIEDest>9</indIEDest></dest>${items}<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>0.30</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>${total}</vNF></ICMSTot>${reform ? "<IBSCBSTot><vBCIBSCBS>0.30</vBCIBSCBS><gIBS><gIBSUF><vIBSUF>0.02</vIBSUF></gIBSUF><gIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun><vIBS>0.02</vIBS></gIBS><gCBS><vCBS>0.04</vCBS></gCBS></IBSCBSTot>" : ""}</total><transp><modFrete>9</modFrete></transp><pag><detPag><tPag>01</tPag><vPag>${total}</vPag></detPag><vTroco>0.00</vTroco></pag></infNFe></NFe>`;
  return authorized
    ? `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">${nfe}<protNFe versao="4.00"><infProt><tpAmb>${environment}</tpAmb><verAplic>fixture</verAplic><chNFe>${key}</chNFe><dhRecbto>2026-10-20T10:01:00-03:00</dhRecbto><nProt>135261000000001</nProt><digVal>TESTE</digVal><cStat>100</cStat><xMotivo>Fixture de teste sem validade fiscal</xMotivo></infProt></protNFe></nfeProc>`
    : nfe;
}
export function fixtureEvent({
  key = fixtureKey(),
  code = "135",
  environment = "2",
  requestOnly = false,
  type = "110111",
} = {}) {
  const event = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><infEvento Id="ID${type}${key}01"><cOrgao>35</cOrgao><tpAmb>${environment}</tpAmb><CNPJ>12345678000195</CNPJ><chNFe>${key}</chNFe><dhEvento>2026-10-20T11:00:00-03:00</dhEvento><tpEvento>${type}</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>135261000000001</nProt><xJust>EVENTO SINTÉTICO PARA TESTE DE IMPORTAÇÃO</xJust></detEvento></infEvento></evento>`;
  return requestOnly
    ? event
    : `<procEventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">${event}<retEvento versao="1.00"><infEvento><tpAmb>${environment}</tpAmb><verAplic>fixture</verAplic><cOrgao>35</cOrgao><cStat>${code}</cStat><xMotivo>Fixture sem validade fiscal</xMotivo><chNFe>${key}</chNFe><tpEvento>${type}</tpEvento><nSeqEvento>1</nSeqEvento><dhRegEvento>2026-10-20T11:01:00-03:00</dhRegEvento><nProt>135261000000002</nProt></infEvento></retEvento></procEventoNFe>`;
}
