import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { decodeJobId, encodeJobId, engineQueueKind, QUEUE_NAMES, type JobData, type QueueKind } from "@vision-mind/jobs";
import type { JobStatus, QueuePort } from "./types.js";

/**
 * Duas filas BullMQ (cli e openrouter, ver @vision-mind/jobs) atras de uma
 * unica QueuePort. O id devolvido ao cliente prefixa a fila de origem, para
 * que getJob saiba onde procurar sem ambiguidade entre as duas numeracoes.
 */
export function createQueue(connection: Redis): QueuePort {
  const queues: Record<QueueKind, Queue<JobData>> = {
    cli: new Queue<JobData>(QUEUE_NAMES.cli, { connection }),
    openrouter: new Queue<JobData>(QUEUE_NAMES.openrouter, { connection }),
  };

  return {
    async add(name, data) {
      const kind = engineQueueKind(data.engine);
      const job = await queues[kind].add(name, data);
      return { id: encodeJobId(kind, job.id ?? "") };
    },

    async getJob(id): Promise<JobStatus | undefined> {
      const decoded = decodeJobId(id);
      if (!decoded) return undefined;

      const job = await queues[decoded.kind].getJob(decoded.rawId);
      if (!job) return undefined;

      const state = await job.getState();
      return {
        id,
        state,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      };
    },

    async list(limit = 20): Promise<JobStatus[]> {
      const perQueue = await Promise.all(
        (Object.entries(queues) as Array<[QueueKind, Queue<JobData>]>).map(async ([kind, queue]) => {
          const jobs = await queue.getJobs(["completed", "active", "waiting", "failed", "delayed"], 0, limit - 1);
          return Promise.all(
            jobs.map(async (job) => ({
              id: encodeJobId(kind, job.id ?? ""),
              state: await job.getState(),
              data: job.data,
              returnvalue: job.returnvalue,
              failedReason: job.failedReason,
              timestamp: job.timestamp,
              processedOn: job.processedOn,
              finishedOn: job.finishedOn,
            })),
          );
        }),
      );

      return perQueue
        .flat()
        .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
        .slice(0, limit);
    },
  };
}
