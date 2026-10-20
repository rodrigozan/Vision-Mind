import { describe, expect, it } from "vitest";
import { detectOverride } from "./overrides.js";

describe("detectOverride", () => {
  it("reconhece os 5 prefixos fixos e remove o prefixo do texto", () => {
    expect(detectOverride("@claude refatora isso")).toEqual({ prefix: "@claude", route: "code-heavy", text: "refatora isso" });
    expect(detectOverride("@codex corrige isso")).toEqual({ prefix: "@codex", route: "code-fast", text: "corrige isso" });
    expect(detectOverride("@qwen roda isso")).toEqual({ prefix: "@qwen", route: "code-cheap", text: "roda isso" });
    expect(detectOverride("@antigravity pesquisa isso")).toEqual({
      prefix: "@antigravity",
      route: "research-agent",
      text: "pesquisa isso",
    });
    expect(detectOverride("@router responde isso")).toEqual({ prefix: "@router", route: "quick-answer", text: "responde isso" });
  });

  it("e case-insensitive no prefixo", () => {
    expect(detectOverride("@Claude faz algo")?.route).toBe("code-heavy");
  });

  it("retorna undefined quando nao ha prefixo reconhecido", () => {
    expect(detectOverride("oi, como vai?")).toBeUndefined();
    expect(detectOverride("@desconhecido faz algo")).toBeUndefined();
  });
});
