import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findSkill, loadSkills } from "./loader.js";

let skillsDir: string;

beforeEach(async () => {
  skillsDir = await mkdtemp(join(tmpdir(), "vision-mind-skills-"));
});

afterEach(async () => {
  await rm(skillsDir, { recursive: true, force: true });
});

async function writeSkill(name: string, frontmatter: string) {
  const dir = join(skillsDir, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "SKILL.md"), frontmatter, "utf8");
}

describe("loadSkills", () => {
  it("retorna lista vazia quando a pasta de skills nao existe", async () => {
    const skills = await loadSkills(join(skillsDir, "nao-existe"));
    expect(skills).toEqual([]);
  });

  it("carrega skills validas, com o corpo do SKILL.md como prompt, e ignora pastas sem SKILL.md", async () => {
    await writeSkill(
      "plan-today",
      `---\nname: plan-today\ntitle: Plan Today\nengine: claude-code\nfallback: openrouter\noutput: diario\nbutton: true\n---\nMonte o plano do dia.\n`,
    );
    await mkdir(join(skillsDir, "vazia"), { recursive: true });

    const skills = await loadSkills(skillsDir);
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({
      name: "plan-today",
      title: "Plan Today",
      engine: "claude-code",
      fallback: "openrouter",
      output: "diario",
      button: true,
      dir: "plan-today",
      prompt: "Monte o plano do dia.",
    });
  });

  it("ignora skill com frontmatter invalido", async () => {
    await writeSkill("quebrada", `---\ntitle: Sem nome nem engine\n---\n`);

    const skills = await loadSkills(skillsDir);
    expect(skills).toEqual([]);
  });

  it("usa button=false como padrao quando nao informado", async () => {
    await writeSkill(
      "weekly-review",
      `---\nname: weekly-review\ntitle: Weekly Review\nengine: openrouter\noutput: diario\n---\nTexto.\n`,
    );

    const [skill] = await loadSkills(skillsDir);
    expect(skill.button).toBe(false);
  });
});

describe("findSkill", () => {
  it("encontra pelo campo name", () => {
    const skills = [
      {
        name: "plan-today",
        title: "Plan Today",
        engine: "claude-code" as const,
        output: "diario",
        button: true,
        dir: "plan-today",
        prompt: "Monte o plano do dia.",
      },
    ];
    expect(findSkill(skills, "plan-today")).toBe(skills[0]);
    expect(findSkill(skills, "outra")).toBeUndefined();
  });
});
