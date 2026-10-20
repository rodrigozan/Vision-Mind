import { describe, expect, it } from "vitest";
import { detectSkill } from "./skills.js";
import type { SkillRef } from "./types.js";

const skills: SkillRef[] = [
  { name: "plan-today", engine: "claude-code" },
  { name: "weekly-review", engine: "openrouter" },
];

describe("detectSkill", () => {
  it("encontra a skill citada no meio do pedido, sem diferenciar maiusculas", () => {
    expect(detectSkill("roda a skill Plan-Today agora", skills)).toEqual(skills[0]);
  });

  it("retorna undefined quando nenhuma skill e citada", () => {
    expect(detectSkill("qualquer outra coisa", skills)).toBeUndefined();
  });

  it("retorna undefined quando a lista de skills esta vazia", () => {
    expect(detectSkill("plan-today", [])).toBeUndefined();
  });
});
