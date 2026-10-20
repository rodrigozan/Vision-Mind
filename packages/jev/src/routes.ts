import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { RouteDefinition, RouteId } from "./types.js";

const EngineIdSchema = z.enum(["claude-code", "codex", "openrouter", "antigravity", "qwen-code"]);

const RouteIdSchema = z.enum([
  "skill",
  "quick-answer",
  "code-heavy",
  "code-fast",
  "code-cheap",
  "research-agent",
  "vault-write",
]);

const RouteDefinitionSchema = z.object({
  id: RouteIdSchema,
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  engine: EngineIdSchema.nullable(),
  uso: z.string(),
});

const RoutesSchema = z.array(RouteDefinitionSchema);

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultRoutesPath = join(moduleDir, "..", "routes.json");

export function loadRoutes(path: string = defaultRoutesPath): RouteDefinition[] {
  const raw = readFileSync(path, "utf8");
  return RoutesSchema.parse(JSON.parse(raw));
}

export function isRouteId(value: string): value is RouteId {
  return RouteIdSchema.safeParse(value).success;
}

export const ROUTES: RouteDefinition[] = loadRoutes();

export const ROUTES_BY_ID: Record<RouteId, RouteDefinition> = Object.fromEntries(
  ROUTES.map((route) => [route.id, route]),
) as Record<RouteId, RouteDefinition>;
