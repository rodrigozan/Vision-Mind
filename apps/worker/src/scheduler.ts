import type { Queue } from "bullmq";
import { engineQueueKind, type JobData, type QueueKind } from "@vision-mind/jobs";
import { findSkill, type SkillDefinition } from "@vision-mind/skills";

export interface ScheduleSpec {
  skillName: string;
  schedulerId: string;
  /** Padrao cron, avaliado no fuso passado a scheduleRecurringSkills. */
  pattern: string;
}

export const SCHEDULES: ScheduleSpec[] = [
  { skillName: "plan-today", schedulerId: "plan-today-dias-uteis", pattern: "0 7 * * 1-5" },
  { skillName: "weekly-review", schedulerId: "weekly-review-sexta", pattern: "0 17 * * 5" },
];

/**
 * Cria (ou atualiza, upsertJobScheduler e idempotente) os jobs repetiveis do
 * roteiro: plan-today em dias uteis as 7h, weekly-review as sextas 17h. Uma
 * skill agendada que ainda nao existe ou tem frontmatter invalido e
 * simplesmente ignorada, sem derrubar o worker.
 */
export async function scheduleRecurringSkills(
  queues: Record<QueueKind, Queue<JobData>>,
  skills: SkillDefinition[],
  tz: string,
): Promise<void> {
  for (const schedule of SCHEDULES) {
    const skill = findSkill(skills, schedule.skillName);
    if (!skill) continue;

    const kind = engineQueueKind(skill.engine);
    const data: JobData = { route: "skill", tier: 1, engine: skill.engine, input: "", skill: skill.name };

    await queues[kind].upsertJobScheduler(schedule.schedulerId, { pattern: schedule.pattern, tz }, { name: "skill", data });
  }
}
