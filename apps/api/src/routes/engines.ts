import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../types.js";

export function registerEnginesRoute(app: FastifyInstance, deps: AppDeps): void {
  app.get("/engines/status", async (_request, reply) => {
    const statuses = await Promise.all(
      deps.registry.listIds().map(async (id) => ({
        engine: id,
        available: await deps.registry.getEngine(id).isAvailable(),
      })),
    );
    return reply.send(statuses);
  });
}
