import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleAsk } from "../ask-handler.js";
import type { AppDeps } from "../types.js";

const AskBodySchema = z.object({ text: z.string().min(1) });

export function registerAskRoute(app: FastifyInstance, deps: AppDeps): void {
  app.post("/ask", async (request, reply) => {
    const parsed = AskBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "texto invalido", details: parsed.error.flatten() });
    }

    const skills = await deps.skills.list();
    const result = await handleAsk({
      text: parsed.data.text,
      registry: deps.registry,
      queue: deps.queue,
      skills: skills.map((skill) => ({ name: skill.name, engine: skill.engine })),
      publish: deps.publish,
    });

    return reply.send(result);
  });
}
