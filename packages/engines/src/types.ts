export type EngineId = "claude-code" | "codex" | "openrouter" | "antigravity" | "qwen-code";

export interface EngineRequest {
  prompt: string;
  cwd?: string;
  model?: string;
  timeoutMs?: number;
}

export interface EngineResult {
  engine: EngineId;
  ok: boolean;
  output: string;
  durationMs: number;
  error?: string;
}

export interface Engine {
  id: EngineId;
  isAvailable(): Promise<boolean>;
  run(req: EngineRequest): Promise<EngineResult>;
}
