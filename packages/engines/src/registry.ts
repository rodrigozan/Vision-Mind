import { createCliEngine } from "./adapters/cli.js";
import { createOpenRouterEngine } from "./adapters/openrouter.js";
import { loadEnginesConfig, type EnginesConfig } from "./config.js";
import type { Engine, EngineId, EngineRequest, EngineResult } from "./types.js";

function buildEngine(id: EngineId, config: EnginesConfig): Engine {
  const engineConfig = config[id];
  if (!engineConfig) {
    throw new Error(`engine "${id}" sem configuracao em engines.config.json`);
  }
  if (id === "openrouter") {
    return createOpenRouterEngine(engineConfig.model ?? "openrouter/auto", engineConfig.timeoutMs);
  }
  return createCliEngine(id, engineConfig);
}

export class EngineRegistry {
  private readonly config: EnginesConfig;
  private readonly cache = new Map<EngineId, Engine>();

  constructor(config: EnginesConfig = loadEnginesConfig()) {
    this.config = config;
  }

  listIds(): EngineId[] {
    return Object.keys(this.config) as EngineId[];
  }

  getEngine(id: EngineId): Engine {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const engine = buildEngine(id, this.config);
    this.cache.set(id, engine);
    return engine;
  }

  fallbackChain(id: EngineId): EngineId[] {
    return [id, ...(this.config[id]?.fallback ?? [])];
  }

  async runWithFallback(id: EngineId, req: EngineRequest): Promise<EngineResult> {
    return runChain(this.fallbackChain(id).map((engineId) => this.getEngine(engineId)), req);
  }
}

/**
 * Tenta cada motor na ordem recebida, pulando os indisponíveis, e retorna o
 * primeiro resultado com sucesso. Extraída da registry para ser testável com
 * motores falsos, sem depender de binários reais nem rede.
 */
export async function runChain(engines: Engine[], req: EngineRequest): Promise<EngineResult> {
  let last: EngineResult | undefined;

  for (const engine of engines) {
    const available = await engine.isAvailable();
    if (!available) {
      last = { engine: engine.id, ok: false, output: "", durationMs: 0, error: "indisponivel" };
      continue;
    }

    const result = await engine.run(req);
    if (result.ok) return result;
    last = result;
  }

  return last ?? { engine: engines[0]?.id ?? "openrouter", ok: false, output: "", durationMs: 0, error: "nenhum motor configurado" };
}
