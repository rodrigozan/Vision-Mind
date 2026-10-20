import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveInVault } from "@vision-mind/vault";
import type { RouteDecision } from "./types.js";

// .vision-mind/ e uma pasta tecnica do proprio sistema, fora da taxonomia
// de conteudo do vault (que nao tem inbox, diario ou pastas de fila).
const LOG_PATH = ".vision-mind/_jev-log.md";

function summarize(text: string, maxLength = 80): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat;
}

export async function logDecision(text: string, decision: RouteDecision, now: Date = new Date()): Promise<void> {
  const absolutePath = resolveInVault(LOG_PATH);
  await mkdir(dirname(absolutePath), { recursive: true });

  const line = `- ${now.toISOString()} | "${summarize(text)}" -> rota=${decision.route} motor=${decision.engine} tier=${decision.tier} fonte=${decision.source} tempo=${decision.durationMs}ms\n`;
  await appendFile(absolutePath, line, "utf8");
}
