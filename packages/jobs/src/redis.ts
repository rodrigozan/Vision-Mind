import { Redis } from "ioredis";

/** maxRetriesPerRequest: null e exigido pelo BullMQ em conexoes usadas por Queue/Worker. */
export function createRedisConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}
