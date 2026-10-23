import { Worker } from "node:worker_threads";
import { resolve as resolvePath } from "node:path";
import type { SchemaSelection } from "@/types/validation";
import { loadSchemaFiles } from "./schemas";
export const XSD_ENGINE = "xmllint-wasm 5.3.0 / libxml2 2.13.8";
export type XsdOutput = { valid: boolean; rawOutput: string };
// Pinned xmllint-wasm worker protocol. Direct ownership lets us terminate it on
// timeout; the package's public validateXML() does not expose cancellation.
export async function validateXsd(
  xml: string,
  schema: SchemaSelection,
  timeoutMs = 15000,
): Promise<XsdOutput> {
  const files = await loadSchemaFiles(schema);
  // Keep this vendor worker as a native file: Turbopack's new Worker() rewrite
  // would move it away from its sibling WASM binary. Both files are traced.
  const worker = Reflect.construct(Worker, [
    resolvePath(process.cwd(), "node_modules/xmllint-wasm/xmllint-node.js"),
    { resourceLimits: { maxOldGenerationSizeMb: 128 }, env: {}, execArgv: [] },
  ]) as Worker;
  try {
    return await new Promise<XsdOutput>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Validação XSD excedeu o limite de tempo.")),
        timeoutMs,
      );
      const finish = (action: () => void) => {
        clearTimeout(timer);
        action();
      };
      worker.once("error", () =>
        finish(() =>
          reject(new Error("Motor XSD indisponível ou sem memória.")),
        ),
      );
      worker.once("exit", () =>
        finish(() =>
          reject(new Error("Motor XSD encerrado antes do resultado.")),
        ),
      );
      worker.on(
        "message",
        (data: {
          "xmllint-wasm"?: boolean;
          exitCode: number;
          stderr: string;
        }) => {
          if (!data["xmllint-wasm"]) return;
          finish(() => {
            if (![0, 3, 4].includes(data.exitCode))
              reject(
                new Error("Não foi possível executar o pacote XSD instalado."),
              );
            else
              resolve({ valid: data.exitCode === 0, rawOutput: data.stderr });
          });
        },
      );
      worker.postMessage({
        "xmllint-wasm": true,
        inputFiles: [{ fileName: "documento.xml", contents: xml }, ...files],
        args: ["--nonet", "--noout", "--schema", schema.entry, "documento.xml"],
        initialMemory: 512,
        maxMemory: 2048,
      });
    });
  } finally {
    await worker.terminate();
  }
}
