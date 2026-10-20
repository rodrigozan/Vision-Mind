import { env } from "@vision-mind/shared";
import type { Engine, EngineRequest, EngineResult } from "../types.js";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export function createOpenRouterEngine(defaultModel: string, timeoutMs: number): Engine {
  return {
    id: "openrouter",
    async isAvailable(): Promise<boolean> {
      return Boolean(env.OPENROUTER_API_KEY);
    },
    async run(req: EngineRequest): Promise<EngineResult> {
      const start = Date.now();
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: req.model ?? defaultModel,
            messages: [{ role: "user", content: req.prompt }],
          }),
          signal: AbortSignal.timeout(req.timeoutMs ?? timeoutMs),
        });
        const durationMs = Date.now() - start;

        if (!response.ok) {
          const text = await response.text();
          return { engine: "openrouter", ok: false, output: "", durationMs, error: `HTTP ${response.status}: ${text}` };
        }

        const data = (await response.json()) as OpenRouterResponse;
        const output = data.choices?.[0]?.message?.content ?? "";
        return { engine: "openrouter", ok: true, output, durationMs };
      } catch (error) {
        return {
          engine: "openrouter",
          ok: false,
          output: "",
          durationMs: Date.now() - start,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
