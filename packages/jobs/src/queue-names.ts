import type { EngineId } from "@vision-mind/engines";

export type QueueKind = "cli" | "openrouter";

/**
 * Nomes de fila sem ":" (o BullMQ rejeita o caractere). Duas filas para que o
 * worker possa usar concorrencia 1 para os motores CLI (pesados, 1 por vez na
 * VPS) e concorrencia maior para o OpenRouter (so chamada HTTP).
 */
export const QUEUE_NAMES: Record<QueueKind, string> = {
  cli: "vision-mind-jobs-cli",
  openrouter: "vision-mind-jobs-openrouter",
};

export function engineQueueKind(engine: EngineId): QueueKind {
  return engine === "openrouter" ? "openrouter" : "cli";
}
