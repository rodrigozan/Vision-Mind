import type { VaultFile } from "@vision-mind/vault";
import type { SkillDefinition } from "@vision-mind/skills";

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terca-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sabado",
];

export interface VaultContext {
  foco: VaultFile;
  todo: VaultFile;
  today: Date;
}

/**
 * Monta o prompt final de uma skill: as instrucoes do SKILL.md + o contexto
 * do cofre (foco da semana e tarefas pendentes, nao mais "nota do dia" - o
 * vault real nao tem diario nem inbox) + o pedido livre do usuario, quando
 * houver. Motores CLI recebem um diretório de execução separado do vault;
 * somente o contexto fornecido pela tarefa é incluído no prompt.
 */
export function buildSkillPrompt(skill: SkillDefinition, context: VaultContext, input: string): string {
  const parts = [skill.prompt.trim()];

  parts.push(`\n---\nHoje e ${WEEKDAYS[context.today.getDay()]}.`);
  parts.push(`\n---\nFoco da semana (${context.foco.path}):\n\n${context.foco.content.trim()}`);
  parts.push(`\n---\nTarefas pendentes (${context.todo.path}):\n\n${context.todo.content.trim()}`);

  if (input.trim()) {
    parts.push(`\n---\nPedido do usuario:\n\n${input.trim()}`);
  }

  return parts.join("\n");
}
