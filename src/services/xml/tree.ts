import { SaxesParser } from "saxes";
export const NFE_NS = "http://www.portalfiscal.inf.br/nfe";
export const MAX_XML_BYTES = 2 * 1024 * 1024;
export class XmlImportError extends Error {
  constructor(
    message: string,
    public code = "INVALID_XML",
  ) {
    super(message);
  }
}
export type XmlNode = {
  name: string;
  uri: string;
  attributes: Record<string, string>;
  text: string;
  children: XmlNode[];
};
export function parseXml(bytes: Uint8Array): XmlNode {
  if (bytes.byteLength > MAX_XML_BYTES)
    throw new XmlImportError("XML excede o limite de 2 MiB.", "FILE_TOO_LARGE");
  let xml: string;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new XmlImportError("O XML precisa estar codificado em UTF-8.");
  }
  const parser = new SaxesParser({ xmlns: true });
  const stack: XmlNode[] = [];
  let root: XmlNode | undefined;
  let nodes = 0;
  parser.on("error", (error) => {
    throw new XmlImportError(`XML malformado: ${error.message}`);
  });
  parser.on("doctype", () => {
    throw new XmlImportError(
      "DTD e entidades externas não são permitidos.",
      "UNSAFE_XML",
    );
  });
  parser.on("xmldecl", (declaration) => {
    if (declaration.encoding && !/^utf-8$/i.test(declaration.encoding))
      throw new XmlImportError("Somente XML UTF-8 é suportado.");
  });
  parser.on("opentag", (tag) => {
    if (
      stack.length >= 64 ||
      ++nodes > 100000 ||
      Object.keys(tag.attributes).length > 32
    )
      throw new XmlImportError(
        "XML excede os limites de complexidade.",
        "XML_LIMIT",
      );
    const node: XmlNode = {
      name: tag.local,
      uri: tag.uri,
      attributes: Object.fromEntries(
        Object.values(tag.attributes)
          .filter((a) => a.uri !== "http://www.w3.org/2000/xmlns/")
          .map((a) => [a.name, a.value]),
      ),
      text: "",
      children: [],
    };
    if (stack.length) stack[stack.length - 1].children.push(node);
    else root = node;
    stack.push(node);
  });
  const append = (value: string) => {
    if (stack.length) stack[stack.length - 1].text += value;
  };
  parser.on("text", append);
  parser.on("cdata", append);
  parser.on("closetag", () => {
    stack.pop();
  });
  parser.write(xml).close();
  if (!root || root.uri !== NFE_NS)
    throw new XmlImportError("Namespace NF-e ausente ou incorreto.");
  return root;
}
export const children = (node: XmlNode | undefined, name: string) =>
  node?.children.filter((n) => n.name === name && n.uri === NFE_NS) || [];
export function child(node: XmlNode | undefined, name: string) {
  const found = children(node, name);
  if (found.length > 1)
    throw new XmlImportError(`Grupo ${name} repetido em posição única.`);
  return found[0];
}
export const value = (node: XmlNode | undefined, name: string) =>
  child(node, name)?.text.trim() || null;
export function required(node: XmlNode | undefined, name: string) {
  const text = value(node, name);
  if (!text) throw new XmlImportError(`Campo essencial ausente: ${name}.`);
  return text;
}
export function plain(node: XmlNode | undefined): unknown {
  if (!node) return null;
  if (!node.children.length) return node.text.trim();
  const result: Record<string, unknown> = Object.create(null);
  for (const n of node.children) {
    if (n.uri !== NFE_NS) continue;
    const previous = result[n.name];
    result[n.name] =
      previous === undefined
        ? plain(n)
        : Array.isArray(previous)
          ? [...previous, plain(n)]
          : [previous, plain(n)];
  }
  if (Object.keys(node.attributes).length)
    result["@attributes"] = node.attributes;
  return result;
}
export function canonical(node: XmlNode): unknown {
  return [
    node.uri,
    node.name,
    Object.entries(node.attributes).sort(([a], [b]) => a.localeCompare(b)),
    node.text.trim(),
    node.children.filter((n) => n.uri === NFE_NS).map(canonical),
  ];
}
export function leafValues(node: XmlNode | undefined, name: string): string[] {
  if (!node) return [];
  return [
    ...(node.name === name ? [node.text.trim()] : []),
    ...node.children
      .filter((n) => n.uri === NFE_NS)
      .flatMap((n) => leafValues(n, name)),
  ];
}
