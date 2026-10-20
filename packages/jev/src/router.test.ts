import { describe, expect, it } from "vitest";
import { decideRoute } from "./router.js";
import { EXAMPLE_SUITE } from "./example-suite.js";
import type { EngineAvailability } from "./engine-resolver.js";
import type { JevClient } from "./jev-client.js";
import type { RouteId, SkillRef } from "./types.js";

describe("decideRoute > override manual", () => {
  const casos: Array<[string, RouteId, string]> = [
    ["@claude refatora esse modulo", "code-heavy", "claude-code"],
    ["@codex corrige esse bug", "code-fast", "codex"],
    ["@qwen roda isso em lote", "code-cheap", "qwen-code"],
    ["@antigravity pesquisa isso", "research-agent", "antigravity"],
    ["@router responde rapido", "quick-answer", "openrouter"],
  ];

  for (const [texto, rotaEsperada, motorEsperado] of casos) {
    it(`"${texto}" forca a rota ${rotaEsperada} / motor ${motorEsperado}`, async () => {
      const decision = await decideRoute({ text: texto });
      expect(decision.route).toBe(rotaEsperada);
      expect(decision.engine).toBe(motorEsperado);
      expect(decision.source).toBe("override");
    });
  }
});

describe("decideRoute > deteccao de skill", () => {
  const skills: SkillRef[] = [{ name: "plan-today", engine: "claude-code" }];

  it("vai direto para a rota skill sem chamar o Jev", async () => {
    const jevClient: JevClient = {
      decide: async () => {
        throw new Error("Jev nao deveria ser chamado quando uma skill e citada");
      },
    };

    const decision = await decideRoute({ text: "roda a skill plan-today agora", skills }, { jevClient });

    expect(decision.route).toBe("skill");
    expect(decision.tier).toBe(1);
    expect(decision.engine).toBe("claude-code");
    expect(decision.source).toBe("skill");
  });

  it("override tem prioridade sobre a deteccao de skill", async () => {
    const decision = await decideRoute({ text: "@codex roda a skill plan-today", skills });
    expect(decision.source).toBe("override");
    expect(decision.engine).toBe("codex");
  });
});

describe("decideRoute > modo sem Jev (JEV_ENABLED=false)", () => {
  it("usa regras de palavra-chave quando jevEnabled e false", async () => {
    const decision = await decideRoute({ text: "corrige esse bug no script" }, { jevEnabled: false });
    expect(decision.route).toBe("code-fast");
    expect(decision.source).toBe("keyword");
  });

  it("cai em quick-answer quando nenhuma palavra-chave bate", async () => {
    const decision = await decideRoute({ text: "oi, bom dia" }, { jevEnabled: false });
    expect(decision.route).toBe("quick-answer");
    expect(decision.source).toBe("keyword");
  });
});

describe("decideRoute > validacao da resposta do Jev", () => {
  it("usa a rota devolvida pelo Jev quando e valida", async () => {
    const jevClient: JevClient = { decide: async () => "research-agent" };
    const decision = await decideRoute({ text: "pesquisa algo" }, { jevClient });
    expect(decision.route).toBe("research-agent");
    expect(decision.source).toBe("jev");
  });

  it('cai em "quick-answer" quando o Jev devolve algo que nao e um id de rota', async () => {
    const jevClient: JevClient = { decide: async () => "nao sei, talvez code-heavy?" };
    const decision = await decideRoute({ text: "qualquer coisa" }, { jevClient });
    expect(decision.route).toBe("quick-answer");
    expect(decision.source).toBe("jev-invalido");
  });

  it('cai em "quick-answer" quando o Jev devolve a propria rota "skill"', async () => {
    const jevClient: JevClient = { decide: async () => "skill" };
    const decision = await decideRoute({ text: "qualquer coisa" }, { jevClient });
    expect(decision.route).toBe("quick-answer");
    expect(decision.source).toBe("jev-invalido");
  });

  it("cai em quick-answer quando a chamada ao Jev falha (rede, timeout etc.)", async () => {
    const jevClient: JevClient = {
      decide: async () => {
        throw new Error("network error");
      },
    };
    const decision = await decideRoute({ text: "qualquer coisa" }, { jevClient });
    expect(decision.route).toBe("quick-answer");
    expect(decision.source).toBe("jev-invalido");
  });
});

describe("decideRoute > fallback de motor indisponivel (integra com a Fase 2)", () => {
  it("usa o fallback configurado quando o motor escolhido esta indisponivel", async () => {
    const registry: EngineAvailability = {
      fallbackChain: (id) => (id === "antigravity" ? ["antigravity", "qwen-code", "openrouter"] : [id]),
      getEngine: (id) => ({
        isAvailable: async () => id !== "antigravity",
      }),
    };

    const jevClient: JevClient = { decide: async () => "research-agent" };
    const decision = await decideRoute({ text: "pesquisa algo" }, { jevClient, registry });

    expect(decision.route).toBe("research-agent");
    expect(decision.engine).toBe("qwen-code");
  });
});

describe("decideRoute > suite de 20 pedidos de exemplo (aceite da Fase 3)", () => {
  function fakeJevModel(text: string): RouteId {
    const lower = text.toLowerCase();
    if (/bug|corrige|ajusta|conserta/.test(lower)) return "code-fast";
    if (/refatora|arquitetura|reescreve/.test(lower)) return "code-heavy";
    if (/lote|em massa|repetitiva/.test(lower)) return "code-cheap";
    if (/pesquisa|investiga/.test(lower)) return "research-agent";
    if (/anota|registra|lembra|cria uma nota/.test(lower)) return "vault-write";
    return "quick-answer";
  }

  it("atinge pelo menos 85% de rotas corretas e decide em menos de 1s por pedido", async () => {
    const jevClient: JevClient = { decide: async (text) => fakeJevModel(text) };

    let acertos = 0;
    for (const [texto, rotaEsperada] of EXAMPLE_SUITE) {
      const decision = await decideRoute({ text: texto }, { jevClient });
      expect(decision.durationMs).toBeLessThan(1000);
      if (decision.route === rotaEsperada) acertos += 1;
    }

    const taxa = acertos / EXAMPLE_SUITE.length;
    expect(taxa).toBeGreaterThanOrEqual(0.85);
  });
});
