import type { RouteId } from "./types.js";

const KEYWORD_RULES: Array<{ route: RouteId; keywords: string[] }> = [
  { route: "code-heavy", keywords: ["refator", "arquitetur", "reescrev", "codigo complexo"] },
  { route: "code-fast", keywords: ["bug", "conserta", "corrige", "ajust", "script"] },
  { route: "code-cheap", keywords: ["em lote", "em massa", "varias tarefas simples"] },
  { route: "research-agent", keywords: ["pesquis", "investiga", "levanta informa"] },
  { route: "vault-write", keywords: ["anota", "registra", "lembra de", "cria uma nota", "agenda isso"] },
];

export function keywordRoute(text: string): RouteId {
  const lower = text.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return rule.route;
    }
  }
  return "quick-answer";
}
