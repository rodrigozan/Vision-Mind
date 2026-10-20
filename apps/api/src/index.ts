import { createLogger, env } from "@vision-mind/shared";
import { EngineRegistry } from "@vision-mind/engines";
import { readFocoDaSemana, readScopedContext } from "@vision-mind/vault";
import { createEventBus, createRedisConnection } from "@vision-mind/jobs";
import { loadSkills } from "@vision-mind/skills";
import { buildApp } from "./app.js";
import { createQueue } from "./queue.js";
import { createVoiceClient } from "./voice-client.js";

const logger = createLogger("api");

async function main() {
  const registry = new EngineRegistry();
  const queue = createQueue(createRedisConnection(env.REDIS_URL));
  const eventBus = createEventBus(env.REDIS_URL);
  const voice = createVoiceClient(env.VOICE_URL);

  const app = await buildApp({
    registry,
    queue,
    skills: { list: () => loadSkills(env.SKILLS_PATH) },
    vault: { readFocoDaSemana, readScopedContext },
    voice,
    publish: (state, extra) => eventBus.publish(state, extra),
    subscribeEvents: (onMessage) => eventBus.subscribe(onMessage),
    apiToken: env.API_TOKEN,
  });

  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  logger.info(`api ouvindo na porta ${env.API_PORT}`);
}

main().catch((error) => {
  logger.error("falha ao iniciar a api", error);
  process.exitCode = 1;
});
