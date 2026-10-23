import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
const tracePath = ".next/server/app/api/validations/route.js.nft.json";
const trace = JSON.parse(await readFile(tracePath, "utf8"));
const files = new Set(trace.files.map((p) => resolve(dirname(tracePath), p)));
const manifest = JSON.parse(await readFile("schemas/manifest.json", "utf8"));
for (const path of [
  ...manifest.files.map((f) => "schemas/" + f.path),
  "node_modules/xmllint-wasm/xmllint-node.js",
  "node_modules/xmllint-wasm/xmllint.wasm",
]) {
  if (!files.has(resolve(path)))
    throw new Error("Recurso ausente no deploy do validador: " + path);
}
console.log("Build inclui os 14 schemas, worker Node e motor WASM.");
