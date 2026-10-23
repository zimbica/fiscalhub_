import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import manifest from "../../schemas/manifest.json";
import { children, type XmlNode } from "@/services/xml/tree";
import type { SchemaSelection } from "@/types/validation";

export const schemaManifest = manifest;
export function bundleHash(directory: string) {
  return createHash("sha256")
    .update(
      manifest.files
        .filter((f) => f.path.startsWith(directory + "/"))
        .map((f) => `${f.path}:${f.sha256}`)
        .sort()
        .join("\n"),
    )
    .digest("hex");
}
export function selectSchema(root: XmlNode): SchemaSelection | null {
  if (["NFe", "nfeProc"].includes(root.name)) {
    const info = child(
      root.name === "NFe" ? root : child(root, "NFe"),
      "infNFe",
    );
    if (
      info?.attributes.versao !== "4.00" ||
      !["55", "65"].includes(value(child(info, "ide"), "mod") || "")
    )
      return null;
    return {
      id: "nfe-010f",
      title: "NF-e/NFC-e · PL 010f v1.04",
      version: "4.00 / PL 010f v1.04",
      directory: "nfe-4.00",
      entry: root.name === "NFe" ? "nfe_v4.00.xsd" : "procNFe_v4.00.xsd",
      sourceUrl: manifest.packages[0].url,
      bundleHash: bundleHash("nfe-4.00"),
    };
  }
  if (["evento", "procEventoNFe"].includes(root.name)) {
    const event = root.name === "evento" ? root : child(root, "evento");
    if (
      event?.attributes.versao !== "1.00" ||
      value(child(event, "infEvento"), "tpEvento") !== "110111"
    )
      return null;
    return {
      id: "cancelamento-110111",
      title: "Evento de cancelamento 110111",
      version: "1.00 / pacote 1.01",
      directory: "cancelamento-1.00",
      entry:
        root.name === "evento"
          ? "eventoCancNFe_v1.00.xsd"
          : "procEventoCancNFe_v1.00.xsd",
      sourceUrl: manifest.packages[2].url,
      bundleHash: bundleHash("cancelamento-1.00"),
    };
  }
  return null;
}
// No XML-provided URL, include path or schemaLocation is ever loaded.
export async function loadSchemaFiles(selection: SchemaSelection) {
  return Promise.all(
    manifest.files
      .filter((f) => f.path.startsWith(selection.directory + "/"))
      .map(async (file) => {
        const bytes = await readFile(
          resolve(process.cwd(), "schemas", file.path),
        );
        if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
          throw new Error("Integridade do pacote XSD não confere.");
        return {
          fileName: file.path.split("/").at(-1)!,
          contents: bytes.toString("utf8"),
        };
      }),
  );
}

function child(node: XmlNode | undefined, name: string) {
  return children(node, name)[0];
}

function value(node: XmlNode | undefined, name: string) {
  return child(node, name)?.text.trim() || null;
}
