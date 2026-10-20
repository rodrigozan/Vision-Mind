import { describe, expect, it } from "vitest";
import { resolveAvailableEngine } from "./engine-resolver.js";
import type { EngineAvailability } from "./engine-resolver.js";

describe("resolveAvailableEngine", () => {
  it("devolve o proprio motor quando nenhum registry e informado", async () => {
    expect(await resolveAvailableEngine("codex")).toBe("codex");
  });

  it("devolve o motor escolhido quando ele esta disponivel", async () => {
    const registry: EngineAvailability = {
      fallbackChain: (id) => [id],
      getEngine: () => ({ isAvailable: async () => true }),
    };
    expect(await resolveAvailableEngine("codex", registry)).toBe("codex");
  });

  it("segue a cadeia de fallback até achar um motor disponivel", async () => {
    const registry: EngineAvailability = {
      fallbackChain: () => ["antigravity", "qwen-code", "openrouter"],
      getEngine: (id) => ({ isAvailable: async () => id === "openrouter" }),
    };
    expect(await resolveAvailableEngine("antigravity", registry)).toBe("openrouter");
  });

  it("devolve o motor original quando nenhum da cadeia esta disponivel", async () => {
    const registry: EngineAvailability = {
      fallbackChain: () => ["antigravity", "qwen-code"],
      getEngine: () => ({ isAvailable: async () => false }),
    };
    expect(await resolveAvailableEngine("antigravity", registry)).toBe("antigravity");
  });
});
