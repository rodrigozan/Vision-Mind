import { describe, expect, it } from "vitest";
import { runChain } from "./registry.js";
import type { Engine, EngineResult } from "./types.js";

function fakeEngine(partial: Partial<Engine> & { id: Engine["id"] }): Engine {
  return {
    isAvailable: async () => true,
    run: async (req): Promise<EngineResult> => ({ engine: partial.id, ok: true, output: req.prompt, durationMs: 1 }),
    ...partial,
  };
}

describe("runChain", () => {
  it("usa o primeiro motor disponivel que tiver sucesso", async () => {
    const indisponivel = fakeEngine({ id: "antigravity", isAvailable: async () => false });
    const falha = fakeEngine({
      id: "qwen-code",
      run: async () => ({ engine: "qwen-code", ok: false, output: "", durationMs: 5, error: "boom" }),
    });
    const sucesso = fakeEngine({ id: "openrouter" });

    const result = await runChain([indisponivel, falha, sucesso], { prompt: "oi" });

    expect(result.engine).toBe("openrouter");
    expect(result.ok).toBe(true);
  });

  it("retorna o ultimo erro quando nenhum motor da chain funciona", async () => {
    const a = fakeEngine({ id: "antigravity", isAvailable: async () => false });
    const b = fakeEngine({
      id: "qwen-code",
      run: async () => ({ engine: "qwen-code", ok: false, output: "", durationMs: 3, error: "sem credito" }),
    });

    const result = await runChain([a, b], { prompt: "oi" });

    expect(result.ok).toBe(false);
    expect(result.engine).toBe("qwen-code");
    expect(result.error).toBe("sem credito");
  });

  it("nao chama run() de motores depois do primeiro sucesso", async () => {
    let chamouDepois = false;
    const sucesso = fakeEngine({ id: "claude-code" });
    const nuncaChamado = fakeEngine({
      id: "codex",
      run: async () => {
        chamouDepois = true;
        return { engine: "codex", ok: true, output: "", durationMs: 1 };
      },
    });

    await runChain([sucesso, nuncaChamado], { prompt: "oi" });

    expect(chamouDepois).toBe(false);
  });
});
