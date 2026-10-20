import { describe, expect, it } from "vitest";
import { loadEnginesConfig } from "./config.js";

describe("loadEnginesConfig", () => {
  it("carrega e valida o engines.config.json real do pacote", () => {
    const config = loadEnginesConfig();

    expect(Object.keys(config).sort()).toEqual(
      ["antigravity", "claude-code", "codex", "openrouter", "qwen-code"].sort(),
    );
    expect(config["claude-code"]?.command).toBe("claude");
    expect(config["claude-code"]?.args).toContain("{prompt}");
    expect(config.openrouter?.command).toBeUndefined();
    expect(config.openrouter?.model).toBe("openrouter/auto");
  });
});
