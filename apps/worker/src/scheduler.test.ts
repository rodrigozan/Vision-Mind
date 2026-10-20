import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import type { JobData, QueueKind } from "@vision-mind/jobs";
import type { SkillDefinition } from "@vision-mind/skills";
import { scheduleRecurringSkills } from "./scheduler.js";

const planToday: SkillDefinition = {
  name: "plan-today",
  title: "Plan Today",
  engine: "claude-code",
  output: "foco-semana",
  button: true,
  dir: "plan-today",
  prompt: "Monte o plano do dia.",
};

const weeklyReview: SkillDefinition = {
  name: "weekly-review",
  title: "Weekly Review",
  engine: "openrouter",
  output: "conhecimento/wiki",
  button: true,
  dir: "weekly-review",
  prompt: "Monte a revisao semanal.",
};

function fakeQueue(): Queue<JobData> {
  return { upsertJobScheduler: vi.fn() } as unknown as Queue<JobData>;
}

describe("scheduleRecurringSkills", () => {
  it("agenda plan-today em dias uteis as 7h na fila cli", async () => {
    const queues: Record<QueueKind, Queue<JobData>> = { cli: fakeQueue(), openrouter: fakeQueue() };

    await scheduleRecurringSkills(queues, [planToday, weeklyReview], "America/Sao_Paulo");

    expect(queues.cli.upsertJobScheduler).toHaveBeenCalledWith(
      "plan-today-dias-uteis",
      { pattern: "0 7 * * 1-5", tz: "America/Sao_Paulo" },
      { name: "skill", data: { route: "skill", tier: 1, engine: "claude-code", input: "", skill: "plan-today" } },
    );
  });

  it("agenda weekly-review as sextas 17h na fila openrouter", async () => {
    const queues: Record<QueueKind, Queue<JobData>> = { cli: fakeQueue(), openrouter: fakeQueue() };

    await scheduleRecurringSkills(queues, [planToday, weeklyReview], "America/Sao_Paulo");

    expect(queues.openrouter.upsertJobScheduler).toHaveBeenCalledWith(
      "weekly-review-sexta",
      { pattern: "0 17 * * 5", tz: "America/Sao_Paulo" },
      { name: "skill", data: { route: "skill", tier: 1, engine: "openrouter", input: "", skill: "weekly-review" } },
    );
  });

  it("ignora um agendamento cuja skill nao existe (ainda) sem lancar erro", async () => {
    const queues: Record<QueueKind, Queue<JobData>> = { cli: fakeQueue(), openrouter: fakeQueue() };

    await expect(scheduleRecurringSkills(queues, [], "America/Sao_Paulo")).resolves.toBeUndefined();

    expect(queues.cli.upsertJobScheduler).not.toHaveBeenCalled();
    expect(queues.openrouter.upsertJobScheduler).not.toHaveBeenCalled();
  });
});
