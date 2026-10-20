import type { EngineId } from "@vision-mind/engines";

export type RouteId =
  | "skill"
  | "quick-answer"
  | "code-heavy"
  | "code-fast"
  | "code-cheap"
  | "research-agent"
  | "vault-write";

export interface RouteDefinition {
  id: RouteId;
  tier: 1 | 2 | 3;
  engine: EngineId | null;
  uso: string;
}

export type DecisionSource = "skill" | "override" | "jev" | "keyword" | "jev-invalido";

export interface RouteDecision {
  route: RouteId;
  tier: 1 | 2 | 3;
  engine: EngineId;
  source: DecisionSource;
  durationMs: number;
}

export interface SkillRef {
  name: string;
  engine: EngineId;
}

export interface DecideRouteInput {
  text: string;
  skills?: SkillRef[];
}
