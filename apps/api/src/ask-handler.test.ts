import { describe, expect, it, vi } from "vitest";
import type { Engine, EngineId, EngineRequest, EngineResult } from "@vision-mind/engines";
import { handleAsk } from "./ask-handler.js";
import type { EngineRegistryLike, QueuePort } from "./types.js";

function fakeEngine(id: EngineId, result: Partial<EngineResult> = {}): Engine {
  return {
    id,
    isAvailable: async () => true,
    run: async (_req: EngineRequest): Promise<EngineResult> => ({
      engine: id,
      ok: true,
      output: "saida",
      durationMs: 1,
      ...result,
    }),
  };
}

function fakeRegistry(runResult: EngineResult): EngineRegistryLike {
  return {
    listIds: () => ["claude-code", "codex", "openrouter", "antigravity", "qwen-code"],
    getEngine: (id) => fakeEngine(id),
    fallbackChain: (id) => [id],
    runWithFallback: vi.fn(async () => runResult),
  };
}

function fakeQueue(jobId = "job-1"): QueuePort {
  return {
    add: vi.fn(async () => ({ id: jobId })),
    getJob: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
  };
}

describe("handleAsk", () => {
  it("responde direto no Tier 2 sem passar pela fila", async () => {
    const runResult: EngineResult = { engine: "openrouter", ok: true, output: "12 vezes 8 e 96", durationMs: 5 };
    const registry = fakeRegistry(runResult);
    const queue = fakeQueue();
    const log = vi.fn();

    const result = await handleAsk({ text: "@router quanto e 12 vezes 8", registry, queue, log });

    expect(result).toEqual({
      mode: "direct",
      route: "quick-answer",
      tier: 2,
      engine: "openrouter",
      output: "12 vezes 8 e 96",
      durationMs: expect.any(Number),
    });
    expect(registry.runWithFallback).toHaveBeenCalledWith("openrouter", { prompt: "@router quanto e 12 vezes 8" });
    expect(queue.add).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("@router quanto e 12 vezes 8", expect.objectContaining({ route: "quick-answer" }));
  });

  it("enfileira um job nos Tiers 1 e 3 e nao chama o motor diretamente", async () => {
    const registry = fakeRegistry({ engine: "claude-code", ok: true, output: "", durationMs: 0 });
    const queue = fakeQueue("job-42");

    const result = await handleAsk({ text: "@claude refatora este modulo", registry, queue, log: vi.fn() });

    expect(result).toEqual({ mode: "queued", jobId: "job-42", route: "code-heavy", tier: 3, engine: "claude-code" });
    expect(queue.add).toHaveBeenCalledWith("code-heavy", {
      route: "code-heavy",
      tier: 3,
      engine: "claude-code",
      input: "@claude refatora este modulo",
    });
    expect(registry.runWithFallback).not.toHaveBeenCalled();
  });

  it("detecta skill citada pelo nome e enfileira como tier 1", async () => {
    const registry = fakeRegistry({ engine: "claude-code", ok: true, output: "", durationMs: 0 });
    const queue = fakeQueue("job-skill");

    const result = await handleAsk({
      text: "roda a skill plan-today agora",
      registry,
      queue,
      skills: [{ name: "plan-today", engine: "claude-code" }],
      log: vi.fn(),
    });

    expect(result).toMatchObject({ mode: "queued", route: "skill", tier: 1, engine: "claude-code", jobId: "job-skill" });
  });

  it("publica working/idle no fluxo normal e error quando o motor falha", async () => {
    const publish = vi.fn();
    const registry: EngineRegistryLike = {
      listIds: () => [],
      getEngine: (id) => fakeEngine(id),
      fallbackChain: (id) => [id],
      runWithFallback: vi.fn(async () => {
        throw new Error("motor indisponivel");
      }),
    };
    const queue = fakeQueue();

    await expect(handleAsk({ text: "@router oi", registry, queue, publish, log: vi.fn() })).rejects.toThrow(
      "motor indisponivel",
    );

    expect(publish).toHaveBeenCalledWith("working");
    expect(publish).toHaveBeenCalledWith("error", { message: "motor indisponivel" });
    expect(publish).not.toHaveBeenCalledWith("idle");
  });
});
