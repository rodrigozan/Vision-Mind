import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppDeps } from "../types.js";

const ContextBody = z.object({
  scopeId: z.string().min(1).max(120),
  query: z.string().min(2).max(500),
}).strict();

export function registerVaultRoute(app: FastifyInstance, deps: AppDeps): void {
  app.get("/vault/today", async (_request, reply) => {
    return reply.send(await deps.vault.readFocoDaSemana());
  });

  app.post("/context/search", async (request, reply) => {
    if (!deps.apiToken) return reply.status(503).send({ error: "API_TOKEN obrigatorio para contexto" });
    const parsed = ContextBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "consulta invalida" });
    try {
      return reply.send(await deps.vault.readScopedContext(parsed.data.scopeId, parsed.data.query));
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro de contexto";
      if (message === "escopo desconhecido" || message === "catalogo de escopos nao configurado") {
        return reply.status(403).send({ error: message });
      }
      return reply.status(422).send({ error: message });
    }
  });
}
