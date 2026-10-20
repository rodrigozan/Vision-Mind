import type { RouteId } from "./types.js";

const OVERRIDE_ROUTES: Record<string, RouteId> = {
  "@claude": "code-heavy",
  "@codex": "code-fast",
  "@qwen": "code-cheap",
  "@antigravity": "research-agent",
  "@router": "quick-answer",
};

export interface OverrideMatch {
  prefix: string;
  route: RouteId;
  text: string;
}

export function detectOverride(text: string): OverrideMatch | undefined {
  const trimmed = text.trim();
  const [firstToken] = trimmed.split(/\s+/, 1);
  const prefix = firstToken?.toLowerCase();
  if (!prefix || !(prefix in OVERRIDE_ROUTES)) return undefined;

  return {
    prefix,
    route: OVERRIDE_ROUTES[prefix]!,
    text: trimmed.slice(firstToken.length).trim(),
  };
}
