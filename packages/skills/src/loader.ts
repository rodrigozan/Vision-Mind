import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { SkillDefinition } from "./types.js";

const EngineIdSchema = z.enum(["claude-code", "codex", "openrouter", "antigravity", "qwen-code"]);

const SkillFrontmatterSchema = z.object({
  name: z.string(),
  title: z.string(),
  engine: EngineIdSchema,
  fallback: EngineIdSchema.optional(),
  output: z.string(),
  button: z.boolean().default(false),
});

/**
 * Le o SKILL.md de cada pasta dentro de skillsPath e valida o frontmatter.
 * Pastas sem SKILL.md ou com frontmatter invalido sao ignoradas
 * silenciosamente, para que uma skill incompleta nunca derrube /skills.
 */
export async function loadSkills(skillsPath: string): Promise<SkillDefinition[]> {
  const root = resolve(process.cwd(), skillsPath);

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const skills: SkillDefinition[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    let raw: string;
    try {
      raw = await readFile(join(root, entry.name, "SKILL.md"), "utf8");
    } catch {
      continue;
    }

    const parsedFile = matter(raw);
    const parsed = SkillFrontmatterSchema.safeParse(parsedFile.data);
    if (!parsed.success) continue;

    skills.push({ ...parsed.data, dir: entry.name, prompt: parsedFile.content.trim() });
  }

  return skills;
}

export function findSkill(skills: SkillDefinition[], name: string): SkillDefinition | undefined {
  return skills.find((skill) => skill.name === name);
}
