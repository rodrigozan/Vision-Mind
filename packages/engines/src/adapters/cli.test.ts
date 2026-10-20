import { beforeEach, describe, expect, it, vi } from "vitest";

const execaMock = vi.fn();

vi.mock("execa", () => ({
  execa: execaMock,
}));

beforeEach(() => {
  execaMock.mockReset();
});

describe("createCliEngine", () => {
  it("substitui {prompt} pelo prompt real e repassa cwd/timeout", async () => {
    execaMock.mockResolvedValue({ failed: false, timedOut: false, exitCode: 0, stdout: "ok", stderr: "" });

    const { createCliEngine } = await import("./cli.js");
    const engine = createCliEngine("claude-code", {
      command: "claude",
      args: ["-p", "{prompt}", "--output-format", "json"],
      versionArgs: ["--version"],
      fallback: [],
      timeoutMs: 1000,
    });

    const result = await engine.run({ prompt: "ola", cwd: "/tmp/algum-dir" });

    expect(execaMock).toHaveBeenCalledWith(
      "claude",
      ["-p", "ola", "--output-format", "json"],
      expect.objectContaining({ cwd: "/tmp/algum-dir", timeout: 1000, stdin: "ignore" }),
    );
    expect(result).toEqual({ engine: "claude-code", ok: true, output: "ok", durationMs: expect.any(Number) });
  });

  it("marca como falha quando o processo termina com erro", async () => {
    execaMock.mockResolvedValue({ failed: true, timedOut: false, exitCode: 1, stdout: "", stderr: "deu ruim" });

    const { createCliEngine } = await import("./cli.js");
    const engine = createCliEngine("codex", {
      command: "codex",
      args: ["exec", "{prompt}"],
      versionArgs: ["--version"],
      fallback: [],
      timeoutMs: 1000,
    });

    const result = await engine.run({ prompt: "ola" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("deu ruim");
  });

  it("isAvailable retorna false quando nao ha command configurado", async () => {
    const { createCliEngine } = await import("./cli.js");
    const engine = createCliEngine("qwen-code", {
      args: [],
      versionArgs: ["--version"],
      fallback: [],
      timeoutMs: 1000,
    });

    expect(await engine.isAvailable()).toBe(false);
  });
});
