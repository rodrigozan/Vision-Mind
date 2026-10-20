import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAuth } from "./auth.js";
import { registerAskRoute } from "./routes/ask.js";
import { registerEnginesRoute } from "./routes/engines.js";
import { registerEventsRoute } from "./routes/events.js";
import { registerJobsRoute } from "./routes/jobs.js";
import { registerSkillsRoutes } from "./routes/skills.js";
import { registerVaultRoute } from "./routes/vault.js";
import { registerVoiceRoute } from "./routes/voice.js";
import type { AppDeps } from "./types.js";

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
  // O padrao do Fastify e 1MB por upload, o que basta para uma gravacao
  // curta feita na hora mas corta qualquer audio "pronto" mais longo que o
  // usuario mande direto para /voice. 100MB cobre horas de fala comprimida
  // (webm/ogg) ou dezenas de minutos de WAV sem compressao.
  await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

  registerAuth(app, deps.apiToken);

  registerAskRoute(app, deps);
  registerVoiceRoute(app, deps);
  registerJobsRoute(app, deps);
  registerEventsRoute(app, deps);
  registerSkillsRoutes(app, deps);
  registerVaultRoute(app, deps);
  registerEnginesRoute(app, deps);

  return app;
}
