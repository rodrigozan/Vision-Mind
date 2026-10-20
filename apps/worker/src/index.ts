import { Queue, Worker } from "bullmq";
import { EngineRegistry } from "@vision-mind/engines";
import { createEventBus, createRedisConnection, QUEUE_NAMES, type JobData } from "@vision-mind/jobs";
import { createLogger, env } from "@vision-mind/shared";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkills } from "@vision-mind/skills";
import { commitAndPush, readFocoDaSemana, readTodo, writeFocoDaSemana, writeNote } from "@vision-mind/vault";
import { createProcessor } from "./processor.js";
import { scheduleRecurringSkills } from "./scheduler.js";
import type { WorkerDeps } from "./types.js";

const logger = createLogger("worker");

async function main() {
  const registry = new EngineRegistry();
  const eventBus = createEventBus(env.REDIS_URL);
  const connection = createRedisConnection(env.REDIS_URL);

  const deps: WorkerDeps = {
    registry,
    skills: { list: () => loadSkills(env.SKILLS_PATH) },
    vault: { readFocoDaSemana, writeFocoDaSemana, readTodo, writeNote, commitAndPush },
    publish: (state, extra) => eventBus.publish(state, extra),
    executionRoot: resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
    allowVaultWrites: env.VAULT_AUTOMATED_WRITES,
  };

  const processJob = createProcessor(deps);

  const queues = {
    cli: new Queue<JobData>(QUEUE_NAMES.cli, { connection }),
    openrouter: new Queue<JobData>(QUEUE_NAMES.openrouter, { connection }),
  };

  const workers = [
    new Worker<JobData>(QUEUE_NAMES.cli, (job) => processJob(job.data), { connection, concurrency: 1 }),
    new Worker<JobData>(QUEUE_NAMES.openrouter, (job) => processJob(job.data), { connection, concurrency: 3 }),
  ];

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      logger.error(`job ${job?.id ?? "?"} (${worker.name}) falhou`, error);
    });
  }

  await scheduleRecurringSkills(queues, await deps.skills.list(), env.TZ);

  logger.info("worker rodando (cli: concorrencia 1, openrouter: concorrencia 3)");

  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("encerrando worker...");
    await Promise.all(workers.map((worker) => worker.close()));
    await Promise.all(Object.values(queues).map((queue) => queue.close()));
    await eventBus.close();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  logger.error("falha ao iniciar o worker", error);
  process.exitCode = 1;
});
