import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteDecision } from "./types.js";

let vaultDir: string;

beforeEach(async () => {
  vaultDir = await mkdtemp(join(tmpdir(), "vision-mind-vault-jevlog-"));
  process.env.VAULT_PATH = vaultDir;
  vi.resetModules();
});

afterEach(async () => {
  await rm(vaultDir, { recursive: true, force: true });
});

describe("logDecision", () => {
  it("cria .vision-mind/_jev-log.md e registra pedido, rota, motor e tempo", async () => {
    const { logDecision } = await import("./log.js");

    const decision: RouteDecision = {
      route: "code-fast",
      tier: 3,
      engine: "codex",
      source: "jev",
      durationMs: 123,
    };

    await logDecision("corrige esse bug no script", decision, new Date("2026-10-18T12:00:00.000Z"));

    const raw = await readFile(join(vaultDir, ".vision-mind", "_jev-log.md"), "utf8");
    expect(raw).toContain("2026-10-18T12:00:00.000Z");
    expect(raw).toContain("corrige esse bug no script");
    expect(raw).toContain("rota=code-fast");
    expect(raw).toContain("motor=codex");
    expect(raw).toContain("tempo=123ms");
  });

  it("acrescenta linhas ao arquivo existente em vez de sobrescrever", async () => {
    const { logDecision } = await import("./log.js");
    const decision: RouteDecision = { route: "quick-answer", tier: 2, engine: "openrouter", source: "jev", durationMs: 10 };

    await logDecision("primeiro pedido", decision);
    await logDecision("segundo pedido", decision);

    const raw = await readFile(join(vaultDir, ".vision-mind", "_jev-log.md"), "utf8");
    const linhas = raw.trim().split("\n");
    expect(linhas).toHaveLength(2);
  });

  it("resume pedidos longos para manter o log legivel", async () => {
    const { logDecision } = await import("./log.js");
    const decision: RouteDecision = { route: "quick-answer", tier: 2, engine: "openrouter", source: "jev", durationMs: 10 };
    const pedidoLongo = "x".repeat(200);

    await logDecision(pedidoLongo, decision);

    const raw = await readFile(join(vaultDir, ".vision-mind", "_jev-log.md"), "utf8");
    expect(raw).toContain("…");
    expect(raw.length).toBeLessThan(pedidoLongo.length + 100);
  });
});
