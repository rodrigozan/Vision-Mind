import type { QueueKind } from "./queue-names.js";

/**
 * Como ha duas filas, o id puro do BullMQ pode colidir entre elas (cada fila
 * numera seus jobs a partir de 1). O id exposto pela API prefixa a fila de
 * origem para que getJob saiba onde procurar.
 */
export function encodeJobId(kind: QueueKind, rawId: string): string {
  return `${kind}:${rawId}`;
}

export function decodeJobId(id: string): { kind: QueueKind; rawId: string } | undefined {
  const separatorIndex = id.indexOf(":");
  if (separatorIndex === -1) return undefined;

  const kind = id.slice(0, separatorIndex);
  if (kind !== "cli" && kind !== "openrouter") return undefined;

  return { kind, rawId: id.slice(separatorIndex + 1) };
}
