import type { SkillRef } from "./types.js";

export function detectSkill(text: string, skills: SkillRef[]): SkillRef | undefined {
  const lower = text.toLowerCase();
  return skills.find((skill) => lower.includes(skill.name.toLowerCase()));
}
