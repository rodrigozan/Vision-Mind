import { Redis } from "ioredis";

export type EventState = "idle" | "listening" | "working" | "speaking" | "error";

export const EVENTS_CHANNEL = "vision-mind:events";

export interface EventBus {
  publish(state: EventState, extra?: Record<string, unknown>): Promise<void>;
  subscribe(onMessage: (raw: string) => void): () => void;
  close(): Promise<void>;
}

/**
 * Publica e assina eventos de estado via Redis pub/sub. A API assina para
 * alimentar o SSE de /events; o worker (Fase 6) publica os estados reais de
 * cada job. Nenhum dos dois conhece o outro diretamente.
 */
export function createEventBus(redisUrl: string): EventBus {
  const publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const listeners = new Set<(raw: string) => void>();
  let subscribed: Promise<void> | undefined;

  function ensureSubscribed(): Promise<void> {
    if (!subscribed) {
      subscribed = subscriber.subscribe(EVENTS_CHANNEL).then(() => {
        subscriber.on("message", (_channel: string, raw: string) => {
          for (const listener of listeners) listener(raw);
        });
      });
    }
    return subscribed!;
  }

  return {
    async publish(state, extra = {}) {
      const payload = JSON.stringify({ state, ts: new Date().toISOString(), ...extra });
      await publisher.publish(EVENTS_CHANNEL, payload);
    },

    subscribe(onMessage) {
      listeners.add(onMessage);
      void ensureSubscribed();
      return () => {
        listeners.delete(onMessage);
      };
    },

    async close() {
      await publisher.quit();
      await subscriber.quit();
    },
  };
}
