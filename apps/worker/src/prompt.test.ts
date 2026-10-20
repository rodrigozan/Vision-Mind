import { describe, expect, it } from "vitest";
import type { SkillDefinition } from "@vision-mind/skills";
import { buildSkillPrompt, type VaultContext } from "./prompt.js";

const skill: SkillDefinition = {
  name: "plan-today",
  title: "Plan Today",
  engine: "claude-code",
  output: "foco-semana",
  button: true,
  dir: "plan-today",
  prompt: "Monte o plano do dia.",
};

const context: VaultContext = {
  foco: { path: "memoria/foco-da-semana.md", content: "**Semana de:** 2026-10-12\n**Prioridade 1:** fechar X", revision: "sha256:foco" },
  todo: { path: "tasks/todo.md", content: "## Esta semana\n- [ ] acompanhar orcamento", revision: "sha256:todo" },
  today: new Date("2026-10-19T12:00:00"), // segunda-feira
};

describe("buildSkillPrompt", () => {
  it("combina as instrucoes da skill com o foco da semana e as tarefas pendentes", () => {
    const prompt = buildSkillPrompt(skill, context, "");

    expect(prompt).toContain("Monte o plano do dia.");
    expect(prompt).toContain("segunda-feira");
    expect(prompt).toContain("memoria/foco-da-semana.md");
    expect(prompt).toContain("fechar X");
    expect(prompt).toContain("tasks/todo.md");
    expect(prompt).toContain("acompanhar orcamento");
    expect(prompt).not.toContain("Pedido do usuario");
  });

  it("acrescenta o pedido do usuario quando ele existe", () => {
    const prompt = buildSkillPrompt(skill, context, "foca em terminar o relatorio X");

    expect(prompt).toContain("Pedido do usuario");
    expect(prompt).toContain("foca em terminar o relatorio X");
  });
});
