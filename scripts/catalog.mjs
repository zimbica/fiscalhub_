import { readFile, writeFile } from "node:fs/promises";
import { catalogSchema, catalogSql } from "../catalog/contract.mjs";
const data = catalogSchema.parse(
  JSON.parse(await readFile("catalog/rejections.json", "utf8")),
);
const output = process.argv[2];
if (output) {
  const previous = await readFile(output, "utf8");
  if (previous.trim())
    throw new Error(
      "Use uma migration nova e vazia; não sobrescreva SQL versionado.",
    );
  await writeFile(output, catalogSql(data));
}
console.log(
  `${data.entries.length} rejeições revisadas; catálogo ${data.revision}${output ? " exportado para " + output : " válido"}.`,
);
