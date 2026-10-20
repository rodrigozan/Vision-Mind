import { describe, expect, it, vi } from "vitest";
import type { EngineRequest, EngineResult } from "@vision-mind/engines";
import type { SkillDefinition } from "@vision-mind/skills";
import { createProcessor } from "./processor.js";
import type { WorkerDeps } from "./types.js";

const planToday: SkillDefinition = {
  name: "plan-today",
  title: "Plan Today",
  engine: "claude-code",
  output: "foco-semana",
  button: true,
  dir: "plan-today",
  prompt: "Monte o plano do dia.",
};

const weeklyReview: SkillDefinition = {
  name: "weekly-review",
  title: "Weekly Review",
  engine: "openrouter",
  output: "conhecimento/wiki",
  button: true,
  dir: "weekly-review",
  prompt: "Monte a revisao semanal.",
};

const inboxBrief: SkillDefinition = {
  name: "inbox-brief",
  title: "Inbox Brief",
  engine: "openrouter",
  output: "none",
  button: true,
  dir: "inbox-brief",
  prompt: "Resuma o que esta pendente.",
};

const contentCascade: SkillDefinition = {
  name: "content-cascade",
  title: "Content Cascade",
  engine: "claude-code",
  output: "conteudo",
  button: true,
  dir: "content-cascade",
  prompt: "Transforme a ideia numa cascata de conteudo.",
};

const MONDAY = new Date("2026-10-19T09:00:00");
const TUESDAY = new Date("2026-10-20T09:00:00");

function fakeDeps(overrides: Partial<WorkerDeps> = {}): WorkerDeps {
  return {
    registry: {
      runWithFallback: vi.fn(
        async (_id, _req: EngineRequest): Promise<EngineResult> => ({
          engine: "claude-code",
          ok: true,
          output: "resultado gerado",
          durationMs: 10,
        }),
      ),
    },
    skills: { list: async () => [planToday, weeklyReview, inboxBrief, contentCascade] },
    vault: {
      readFocoDaSemana: vi.fn(async () => ({ path: "memoria/foco-da-semana.md", content: "**Semana de:** 2026-10-12", revision: "sha256:old" })),
      writeFocoDaSemana: vi.fn(async (content: string) => ({ path: "memoria/foco-da-semana.md", content, revision: "sha256:new" })),
      readTodo: vi.fn(async () => ({ path: "tasks/todo.md", content: "## Esta semana\n- [ ] algo", revision: "sha256:todo" })),
      writeNote: vi.fn(async (pasta: string, titulo: string) => `${pasta}/${titulo}.md`),
      commitAndPush: vi.fn(async () => ({ committed: true, pushed: false })),
    },
    publish: vi.fn(),
    executionRoot: "/root/Vision-Mind",
    allowVaultWrites: true,
    ...overrides,
  };
}

function withFakeNow(date: Date, fn: () => Promise<void>) {
  vi.useFakeTimers();
  vi.setSystemTime(date);
  return fn().finally(() => vi.useRealTimers());
}

describe("createProcessor", () => {
  it("plan-today numa segunda-feira reescreve memoria/foco-da-semana.md", async () => {
    await withFakeNow(MONDAY, async () => {
      const deps = fakeDeps();
      const processJob = createProcessor(deps);

      const result = await processJob({ route: "skill", tier: 1, engine: "claude-code", input: "", skill: "plan-today" });

      expect(deps.registry.runWithFallback).toHaveBeenCalledWith("claude-code", {
        prompt: expect.stringContaining("Monte o plano do dia."),
        cwd: "/root/Vision-Mind",
      });
      expect(deps.vault.writeFocoDaSemana).toHaveBeenCalledWith("resultado gerado", "sha256:old");
      expect(deps.vault.writeNote).not.toHaveBeenCalled();
      expect(deps.vault.commitAndPush).toHaveBeenCalledWith("skill: plan-today", ["memoria/foco-da-semana.md"]);
      expect(result).toEqual({ output: "resultado gerado", engine: "claude-code", path: "memoria/foco-da-semana.md" });
      expect(deps.publish).toHaveBeenCalledWith("working", { route: "skill", engine: "claude-code", skill: "plan-today" });
      expect(deps.publish).toHaveBeenCalledWith("idle");
    });
  });

  it("plan-today fora de segunda-feira so le e devolve, sem gravar nada", async () => {
    await withFakeNow(TUESDAY, async () => {
      const deps = fakeDeps();
      const processJob = createProcessor(deps);

      const result = await processJob({ route: "skill", tier: 1, engine: "claude-code", input: "", skill: "plan-today" });

      expect(deps.vault.writeFocoDaSemana).not.toHaveBeenCalled();
      expect(deps.vault.commitAndPush).not.toHaveBeenCalled();
      expect(result).toEqual({ output: "resultado gerado", engine: "claude-code" });
    });
  });

  it("inbox-brief (output=none) nunca grava nada no cofre", async () => {
    const deps = fakeDeps();
    const processJob = createProcessor(deps);

    const result = await processJob({ route: "skill", tier: 1, engine: "openrouter", input: "", skill: "inbox-brief" });

    expect(deps.vault.writeNote).not.toHaveBeenCalled();
    expect(deps.vault.writeFocoDaSemana).not.toHaveBeenCalled();
    expect(deps.vault.commitAndPush).not.toHaveBeenCalled();
    expect(result).toEqual({ output: "resultado gerado", engine: "claude-code" });
  });

  it("content-cascade usa a linha DESTINO da resposta para escolher a pasta", async () => {
    const deps = fakeDeps({
      registry: {
        runWithFallback: vi.fn(
          async (): Promise<EngineResult> => ({
            engine: "claude-code",
            ok: true,
            output: "DESTINO: clientes/igreja-principios-de-vida/conteudo\n\n# Posts\n\nConteudo aqui.",
            durationMs: 10,
          }),
        ),
      },
    });
    const processJob = createProcessor(deps);

    const result = await processJob({ route: "skill", tier: 1, engine: "claude-code", input: "", skill: "content-cascade" });

    expect(deps.vault.writeNote).toHaveBeenCalledWith(
      "clientes/igreja-principios-de-vida/conteudo",
      expect.stringContaining("Content Cascade"),
      "# Posts\n\nConteudo aqui.",
      { skill: "content-cascade", engine: "claude-code" },
    );
    expect(result.output).toBe("# Posts\n\nConteudo aqui.");
  });

  it("content-cascade sem linha DESTINO cai no padrao negocio/conteudo", async () => {
    const deps = fakeDeps();
    const processJob = createProcessor(deps);

    await processJob({ route: "skill", tier: 1, engine: "claude-code", input: "", skill: "content-cascade" });

    expect(deps.vault.writeNote).toHaveBeenCalledWith(
      "negocio/conteudo",
      expect.stringContaining("Content Cascade"),
      "resultado gerado",
      { skill: "content-cascade", engine: "claude-code" },
    );
  });

  it("bloqueia destino definido pelo modelo fora das pastas de conteudo", async () => {
    const deps = fakeDeps({
      registry: { runWithFallback: vi.fn(async (): Promise<EngineResult> => ({ engine: "claude-code", ok: true, output: "DESTINO: pessoal/saude\n\ntexto", durationMs: 1 })) },
    });
    await expect(createProcessor(deps)({ route: "skill", tier: 1, engine: "claude-code", input: "", skill: "content-cascade" })).rejects.toThrow("destino de conteudo nao autorizado");
    expect(deps.vault.writeNote).not.toHaveBeenCalled();
  });

  it("mantem escrita automatica desligada quando a politica nao permite", async () => {
    const deps = fakeDeps({ allowVaultWrites: false });
    await expect(createProcessor(deps)({ route: "skill", tier: 1, engine: "claude-code", input: "", skill: "content-cascade" })).rejects.toThrow("escrita automatica no vault desabilitada");
    expect(deps.vault.writeNote).not.toHaveBeenCalled();
    expect(deps.vault.commitAndPush).not.toHaveBeenCalled();
  });

  it("roda uma skill com output=conhecimento/wiki e cria uma nota nova via writeNote", async () => {
    const deps = fakeDeps();
    const processJob = createProcessor(deps);

    await processJob({ route: "skill", tier: 1, engine: "openrouter", input: "", skill: "weekly-review" });

    expect(deps.vault.writeNote).toHaveBeenCalledWith(
      "conhecimento/wiki",
      expect.stringContaining("Weekly Review"),
      "resultado gerado",
      { skill: "weekly-review", engine: "claude-code" },
    );
    expect(deps.vault.commitAndPush).toHaveBeenCalledWith("skill: weekly-review", [expect.stringContaining("Weekly Review")]);
  });

  it("falha e publica error quando a skill citada nao existe", async () => {
    const deps = fakeDeps();
    const processJob = createProcessor(deps);

    await expect(
      processJob({ route: "skill", tier: 1, engine: "claude-code", input: "", skill: "nao-existe" }),
    ).rejects.toThrow('skill "nao-existe" nao encontrada');

    expect(deps.publish).toHaveBeenCalledWith("error", { message: 'skill "nao-existe" nao encontrada' });
    expect(deps.vault.commitAndPush).not.toHaveBeenCalled();
  });

  it("falha e publica error quando o motor nao responde ok, sem gravar nada no cofre", async () => {
    const deps = fakeDeps({
      registry: {
        runWithFallback: vi.fn(
          async (): Promise<EngineResult> => ({ engine: "claude-code", ok: false, output: "", durationMs: 1, error: "timeout" }),
        ),
      },
    });
    const processJob = createProcessor(deps);

    await expect(
      processJob({ route: "skill", tier: 1, engine: "claude-code", input: "", skill: "plan-today" }),
    ).rejects.toThrow("timeout");

    expect(deps.vault.writeFocoDaSemana).not.toHaveBeenCalled();
    expect(deps.vault.commitAndPush).not.toHaveBeenCalled();
    expect(deps.publish).toHaveBeenCalledWith("error", { message: "timeout" });
  });

  it("roda um job de codigo direto (sem skill) sem tocar no cofre", async () => {
    const deps = fakeDeps();
    const processJob = createProcessor(deps);

    const result = await processJob({ route: "code-heavy", tier: 3, engine: "claude-code", input: "refatora isso" });

    expect(deps.registry.runWithFallback).toHaveBeenCalledWith("claude-code", {
      prompt: "refatora isso",
      cwd: "/root/Vision-Mind",
    });
    expect(deps.vault.writeNote).not.toHaveBeenCalled();
    expect(deps.vault.readFocoDaSemana).not.toHaveBeenCalled();
    expect(deps.vault.commitAndPush).not.toHaveBeenCalled();
    expect(result).toEqual({ output: "resultado gerado", engine: "claude-code" });
  });
});
