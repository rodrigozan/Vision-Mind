import { decideRoute, logDecision, type DecideRouteDeps, type SkillRef } from "@vision-mind/jev";
import type { EventState } from "@vision-mind/jobs";
import type { AskResponse, EngineRegistryLike, QueuePort } from "./types.js";

export interface AskDeps {
  text: string;
  registry: EngineRegistryLike;
  queue: QueuePort;
  skills?: SkillRef[];
  jevDeps?: Omit<DecideRouteDeps, "registry">;
  publish?: (state: EventState, extra?: Record<string, unknown>) => Promise<void> | void;
  log?: typeof logDecision;
}

/**
 * Logica pura do /ask e do /voice: decide a rota via Jev, responde direto no
 * Tier 2 ou enfileira um job nos Tiers 1/3. Sem dependencia do Fastify, para
 * ser testavel com motores e fila falsos.
 */
export async function handleAsk(deps: AskDeps): Promise<AskResponse> {
  const { text, registry, queue, skills, jevDeps, publish = () => {}, log = logDecision } = deps;

  await publish("working");

  try {
    const decision = await decideRoute({ text, skills }, { ...jevDeps, registry });
    await log(text, decision);

    if (decision.tier === 2) {
      const result = await registry.runWithFallback(decision.engine, { prompt: text });
      await publish("idle");
      return {
        mode: "direct",
        route: decision.route,
        tier: 2,
        engine: result.engine,
        output: result.output,
        durationMs: decision.durationMs,
      };
    }

    const job = await queue.add(decision.route, {
      route: decision.route,
      tier: decision.tier,
      engine: decision.engine,
      input: text,
    });

    await publish("idle");
    return {
      mode: "queued",
      jobId: job.id,
      route: decision.route,
      tier: decision.tier,
      engine: decision.engine,
    };
  } catch (error) {
    await publish("error", { message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
