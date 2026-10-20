import type { FastifyInstance } from "fastify";
import { findSkill } from "@vision-mind/skills";
import type { AppDeps } from "../types.js";

export function registerSkillsRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.get("/skills", async (_request, reply) => {
    return reply.send(await deps.skills.list());
  });

  app.post("/skills/:name/run", async (request, reply) => {
    const { name } = request.params as { name: string };
    const skill = findSkill(await deps.skills.list(), name);
    if (!skill) {
      return reply.status(404).send({ error: `skill "${name}" nao encontrada` });
    }

    const body = (request.body ?? {}) as { input?: string };
    const job = await deps.queue.add("skill", {
      route: "skill",
      tier: 1,
      engine: skill.engine,
      input: body.input ?? "",
      skill: skill.name,
    });

    await deps.publish("working");
    return reply.send({
      mode: "queued",
      jobId: job.id,
      route: "skill",
      tier: 1,
      engine: skill.engine,
      skill: skill.name,
    });
  });
}
