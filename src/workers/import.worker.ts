import { expandFiles } from "@/lib/documents/archive";
const scope = self as unknown as {
  onmessage:
    | ((event: MessageEvent<{ type: "start" | "ack"; files?: File[] }>) => void)
    | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
let acknowledge: (() => void) | undefined;
scope.onmessage = async (
  event: MessageEvent<{ type: "start" | "ack"; files?: File[] }>,
) => {
  if (event.data.type === "ack") {
    acknowledge?.();
    return;
  }
  try {
    const result = await expandFiles(event.data.files || [], async (entry) => {
      await new Promise<void>((resolve) => {
        acknowledge = resolve;
        scope.postMessage(
          { type: "entry", ...entry },
          entry.bytes ? [entry.bytes.buffer as ArrayBuffer] : [],
        );
      });
    });
    scope.postMessage({ type: "done", ...result });
  } catch (error) {
    scope.postMessage({
      type: "fatal",
      error:
        error instanceof Error
          ? error.message
          : "Falha no processamento do lote.",
    });
  }
};
