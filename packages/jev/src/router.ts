import { env } from "@vision-mind/shared";
import type { EngineId } from "@vision-mind/engines";
import { detectOverride } from "./overrides.js";
import { detectSkill } from "./skills.js";
import { keywordRoute } from "./keywords.js";
import { createOpenRouterJevClient, type JevClient } from "./jev-client.js";
import { resolveAvailableEngine, type EngineAvailability } from "./engine-resolver.js";
import { isRouteId, ROUTES_BY_ID } from "./routes.js";
import type { DecideRouteInput, DecisionSource, RouteDecision, RouteId } from "./types.js";

export interface DecideRouteDeps {
  jevEnabled?: boolean;
  openRouterApiKey?: string;
  jevModel?: string;
  jevClient?: JevClient;
  registry?: EngineAvailability;
}

async function finish(
  routeId: RouteId,
  engineOverride: EngineId | undefined,
  source: DecisionSource,
  start: number,
  registry: EngineAvailability | undefined,
): Promise<RouteDecision> {
  const route = ROUTES_BY_ID[routeId];
  const baseEngine = engineOverride ?? route.engine;
  if (!baseEngine) {
    throw new Error(`rota "${routeId}" nao tem motor definido e nenhum motor foi informado`);
  }

  const engine = await resolveAvailableEngine(baseEngine, registry);

  return {
    route: routeId,
    tier: route.tier,
    engine,
    source,
    durationMs: Date.now() - start,
  };
}

export async function decideRoute(input: DecideRouteInput, deps: DecideRouteDeps = {}): Promise<RouteDecision> {
  const start = Date.now();
  const text = input.text.trim();

  const override = detectOverride(text);
  if (override) {
    return finish(override.route, undefined, "override", start, deps.registry);
  }

  const skill = detectSkill(text, input.skills ?? []);
  if (skill) {
    return finish("skill", skill.engine, "skill", start, deps.registry);
  }

  const jevEnabled = deps.jevEnabled ?? env.JEV_ENABLED;
  if (!jevEnabled) {
    return finish(keywordRoute(text), undefined, "keyword", start, deps.registry);
  }

  try {
    const client =
      deps.jevClient ??
      createOpenRouterJevClient(deps.openRouterApiKey ?? env.OPENROUTER_API_KEY, deps.jevModel ?? env.JEV_MODEL);
    const raw = (await client.decide(text)).trim();

    if (isRouteId(raw) && raw !== "skill") {
      return finish(raw, undefined, "jev", start, deps.registry);
    }
    return finish("quick-answer", undefined, "jev-invalido", start, deps.registry);
  } catch {
    return finish("quick-answer", undefined, "jev-invalido", start, deps.registry);
  }
}
