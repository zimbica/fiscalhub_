import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, posix } from "node:path";
import { SaxesParser } from "saxes";
const manifest = JSON.parse(
  await readFile(new URL("../schemas/manifest.json", import.meta.url), "utf8"),
);
const paths = new Set(manifest.files.map((f) => f.path));
for (const file of manifest.files) {
  if (
    !/^[a-zA-Z0-9_./-]+$/.test(file.path) ||
    file.path.includes("..") ||
    file.path.startsWith("/")
  )
    throw new Error("Caminho de schema inválido.");
  const bytes = await readFile(
    new URL("../schemas/" + file.path, import.meta.url),
  );
  if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
    throw new Error(`Hash divergente: ${file.path}`);
  const parser = new SaxesParser({ xmlns: true });
  parser.on("doctype", () => {
    throw new Error("DTD não permitido em schemas.");
  });
  parser.on("opentag", (tag) => {
    if (
      tag.uri === "http://www.w3.org/2001/XMLSchema" &&
      ["include", "import"].includes(tag.local)
    ) {
      const location = tag.attributes.schemaLocation?.value;
      if (
        !location ||
        !/^[\w.-]+\.xsd$/.test(location) ||
        !paths.has(posix.join(dirname(file.path), location))
      )
        throw new Error(
          `Dependência não empacotada: ${file.path} → ${location}`,
        );
    }
  });
  parser.write(bytes.toString("utf8")).close();
}
console.log(`${paths.size} schemas íntegros; dependências locais completas.`);
