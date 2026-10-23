import { fixtureNfe, fixtureKey, fixtureEvent } from "./fiscal-fixtures";
// XSD-conformant synthetic structure. Signature/certificate are placeholders,
// deliberately not cryptographically valid and never SEFAZ-authorized.
export function fixtureSignature(id: string) {
  return `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI="#${id}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><DigestValue>AAAAAAAAAAAAAAAAAAAAAAAAAAA=</DigestValue></Reference></SignedInfo><SignatureValue>QUFBQQ==</SignatureValue><KeyInfo><X509Data><X509Certificate>QUFBQQ==</X509Certificate></X509Data></KeyInfo></Signature>`;
}
export function validSchemaNfe(model = "55") {
  return fixtureNfe({ model })
    .replaceAll("<vDesc>0.00</vDesc><indTot>", "<indTot>")
    .replace("</NFe>", fixtureSignature("NFe" + fixtureKey(model)) + "</NFe>")
    .replace(
      "<digVal>TESTE</digVal>",
      "<digVal>AAAAAAAAAAAAAAAAAAAAAAAAAAA=</digVal>",
    )
    .replaceAll("><", ">\n<");
}
export function validSchemaEvent() {
  return fixtureEvent()
    .replace(
      "</evento>",
      fixtureSignature("ID110111" + fixtureKey() + "01") + "</evento>",
    )
    .replaceAll("><", ">\n<");
}
export function validSchemaReform() {
  return validSchemaNfe().replaceAll(
    "</imposto>",
    `<IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib><gIBSCBS><vBC>0.10</vBC><gIBSUF><pIBSUF>0.1000</pIBSUF><vIBSUF>0.01</vIBSUF></gIBSUF><gIBSMun><pIBSMun>0.0000</pIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun><vIBS>0.01</vIBS><gCBS><pCBS>0.9000</pCBS><vCBS>0.02</vCBS></gCBS></gIBSCBS></IBSCBS></imposto>`,
  );
}
