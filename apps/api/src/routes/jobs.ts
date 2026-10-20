import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../types.js";

export function registerJobsRoute(app: FastifyInstance, deps: AppDeps): void {
  app.get("/jobs", async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? Number(query.limit) : undefined;
    return reply.send(await deps.queue.list(limit && Number.isFinite(limit) ? limit : undefined));
  });

  app.get("/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await deps.queue.getJob(id);
    if (!job) {
      return reply.status(404).send({ error: "job nao encontrado" });
    }
    return reply.send(job);
  });
}
