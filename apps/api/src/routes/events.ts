import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../types.js";

export function registerEventsRoute(app: FastifyInstance, deps: AppDeps): void {
  app.get("/events", async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    reply.raw.write(`data: ${JSON.stringify({ state: "idle", ts: new Date().toISOString() })}\n\n`);

    const unsubscribe = deps.subscribeEvents((raw) => {
      reply.raw.write(`data: ${raw}\n\n`);
    });

    request.raw.on("close", unsubscribe);
  });
}
