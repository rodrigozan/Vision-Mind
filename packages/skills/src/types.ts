import type { EngineId } from "@vision-mind/engines";

export interface SkillDefinition {
  name: string;
  title: string;
  engine: EngineId;
  fallback?: EngineId;
  output: string;
  button: boolean;
  dir: string;
  /** Corpo do SKILL.md (sem o frontmatter): as instrucoes que viram o prompt da skill. */
  prompt: string;
}
