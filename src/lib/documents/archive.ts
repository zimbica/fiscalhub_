import { ZipReader, BlobReader } from "@zip.js/zip.js";
export const archiveLimits = {
  xml: 2 * 1024 * 1024,
  zip: 32 * 1024 * 1024,
  total: 128 * 1024 * 1024,
  entries: 10000,
  ratio: 200,
};
export type ExpandedEntry = {
  name: string;
  bytes?: Uint8Array;
  error?: string;
};
export function checkArchiveEntry(entry: {
  filename: string;
  uncompressedSize: number;
  compressedSize: number;
  encrypted: boolean;
}) {
  if (entry.encrypted) throw new Error("ZIP criptografado não é suportado.");
  if (
    entry.filename.length > 200 ||
    /(^|[\\/])\.\.([\\/]|$)|^[\\/]|^[a-z]:/i.test(entry.filename) ||
    Array.from(entry.filename).some((c) => c.charCodeAt(0) < 32)
  )
    throw new Error("Caminho inseguro no ZIP.");
  if (entry.uncompressedSize > archiveLimits.xml)
    throw new Error("XML no ZIP excede 2 MiB.");
  if (
    entry.uncompressedSize >
    Math.max(1, entry.compressedSize) * archiveLimits.ratio
  )
    throw new Error("Taxa de expansão do ZIP excede o limite de segurança.");
}
export async function expandFiles(
  files: File[],
  emit: (entry: ExpandedEntry) => Promise<void>,
) {
  let count = 0,
    total = 0,
    ignored = 0;
  async function send(entry: ExpandedEntry) {
    if (++count > archiveLimits.entries)
      throw new Error("O lote aceita até 10.000 entradas.");
    total += entry.bytes?.byteLength || 0;
    if (total > archiveLimits.total)
      throw new Error(
        "O lote excede 128 MiB descompactados. Divida os arquivos.",
      );
    await emit(entry);
  }
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".xml")) {
      if (file.size > archiveLimits.xml) {
        await send({
          name: file.name.slice(0, 240),
          error: "XML excede 2 MiB.",
        });
        continue;
      }
      await send({
        name: file.name.slice(0, 240),
        bytes: new Uint8Array(await file.arrayBuffer()),
      });
      continue;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      await send({
        name: file.name.slice(0, 240),
        error: "Selecione XML ou ZIP.",
      });
      continue;
    }
    if (file.size > archiveLimits.zip) {
      await send({
        name: file.name.slice(0, 240),
        error: "ZIP excede 32 MiB.",
      });
      continue;
    }
    const zip = new ZipReader(new BlobReader(file), {
      useWebWorkers: false,
      checkCrc32: true,
      filenameValidation: "strict",
      checkOverlappingEntry: true,
    });
    let zipEntries = 0,
      xmlEntries = 0;
    try {
      for await (const entry of zip.getEntriesGenerator()) {
        if (++zipEntries > archiveLimits.entries)
          throw new Error("ZIP contém mais de 10.000 entradas.");
        if (entry.directory) continue;
        if (!entry.filename.toLowerCase().endsWith(".xml")) {
          ignored++;
          continue;
        }
        xmlEntries++;
        const name = `${file.name}/${entry.filename}`.slice(0, 240);
        try {
          checkArchiveEntry(entry);
          let size = 0;
          const chunks: Uint8Array[] = [];
          await entry.getData(
            new WritableStream<Uint8Array>({
              write(chunk) {
                size += chunk.byteLength;
                if (
                  size > archiveLimits.xml ||
                  total + size > archiveLimits.total
                )
                  throw new Error("Expansão real excedeu o limite permitido.");
                chunks.push(chunk);
              },
            }),
            { useWebWorkers: false, checkCrc32: true },
          );
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
          }
          await send({ name, bytes });
        } catch (error) {
          await send({
            name,
            error:
              error instanceof Error ? error.message : "Falha ao extrair XML.",
          });
        }
      }
      if (!xmlEntries)
        await send({
          name: file.name.slice(0, 240),
          error: "ZIP não contém XMLs individuais suportados.",
        });
    } finally {
      await zip.close();
    }
  }
  return { count, ignored };
}
