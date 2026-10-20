import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * Token longo definido em API_TOKEN. Aceita tanto o header Authorization
 * quanto um query param "token" (EventSource do navegador nao envia headers
 * customizados, e /events precisa continuar autenticado).
 *
 * Quando API_TOKEN esta vazio (modo dev), a autenticacao fica desativada.
 */
export function isAuthorized(request: FastifyRequest, apiToken: string): boolean {
  if (!apiToken) return true;

  const header = request.headers.authorization;
  if (header === `Bearer ${apiToken}`) return true;

  const query = request.query as Record<string, unknown> | undefined;
  return typeof query?.token === "string" && query.token === apiToken;
}

export function registerAuth(app: FastifyInstance, apiToken: string): void {
  app.addHook("onRequest", async (request, reply) => {
    if (!isAuthorized(request, apiToken)) {
      await reply.status(401).send({ error: "nao autorizado" });
    }
  });
}
