import { describe, expect, it } from "vitest";
import { engineQueueKind, QUEUE_NAMES } from "./queue-names.js";

describe("engineQueueKind", () => {
  it("manda openrouter para a fila openrouter", () => {
    expect(engineQueueKind("openrouter")).toBe("openrouter");
  });

  it("manda qualquer motor CLI para a fila cli", () => {
    expect(engineQueueKind("claude-code")).toBe("cli");
    expect(engineQueueKind("codex")).toBe("cli");
    expect(engineQueueKind("qwen-code")).toBe("cli");
    expect(engineQueueKind("antigravity")).toBe("cli");
  });
});

describe("QUEUE_NAMES", () => {
  it("nao contem ':' (o BullMQ rejeita o caractere no nome da fila)", () => {
    expect(QUEUE_NAMES.cli).not.toContain(":");
    expect(QUEUE_NAMES.openrouter).not.toContain(":");
  });
});
