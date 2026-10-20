import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { EngineId } from "./types.js";

const EngineIdSchema = z.enum(["claude-code", "codex", "openrouter", "antigravity", "qwen-code"]);

const EngineConfigSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  versionArgs: z.array(z.string()).default(["--version"]),
  model: z.string().optional(),
  fallback: z.array(EngineIdSchema).default([]),
  timeoutMs: z.number().int().positive().default(60000),
});

const EnginesConfigSchema = z.record(EngineIdSchema, EngineConfigSchema);

export type EngineConfig = z.infer<typeof EngineConfigSchema>;
export type EnginesConfig = Partial<Record<EngineId, EngineConfig>>;

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultConfigPath = join(moduleDir, "..", "engines.config.json");

export function loadEnginesConfig(path: string = defaultConfigPath): EnginesConfig {
  const raw = readFileSync(path, "utf8");
  return EnginesConfigSchema.parse(JSON.parse(raw));
}
