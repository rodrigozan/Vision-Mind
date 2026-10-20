import { beforeEach, describe, expect, it, vi } from "vitest";

const publishMock = vi.fn();
const subscribeMock = vi.fn().mockResolvedValue(undefined);
const quitMock = vi.fn();
const onMock = vi.fn();

const RedisMock = vi.fn().mockImplementation(() => ({
  publish: publishMock,
  subscribe: subscribeMock,
  on: onMock,
  quit: quitMock,
}));

vi.mock("ioredis", () => ({ default: RedisMock, Redis: RedisMock }));

beforeEach(() => {
  publishMock.mockReset();
  subscribeMock.mockReset().mockResolvedValue(undefined);
  quitMock.mockReset();
  onMock.mockReset();
  RedisMock.mockClear();
});

describe("createEventBus", () => {
  it("publica no canal fixo com estado e timestamp", async () => {
    const { createEventBus, EVENTS_CHANNEL } = await import("./events.js");
    const bus = createEventBus("redis://127.0.0.1:6379");

    await bus.publish("working", { route: "code-heavy" });

    expect(publishMock).toHaveBeenCalledTimes(1);
    const [channel, payload] = publishMock.mock.calls[0];
    expect(channel).toBe(EVENTS_CHANNEL);
    const parsed = JSON.parse(payload);
    expect(parsed).toMatchObject({ state: "working", route: "code-heavy" });
    expect(typeof parsed.ts).toBe("string");
  });

  it("assina o canal uma unica vez mesmo com varios listeners", async () => {
    const { createEventBus } = await import("./events.js");
    const bus = createEventBus("redis://127.0.0.1:6379");

    const unsubscribeA = bus.subscribe(() => {});
    const unsubscribeB = bus.subscribe(() => {});
    await Promise.resolve();
    await Promise.resolve();

    expect(subscribeMock).toHaveBeenCalledTimes(1);

    unsubscribeA();
    unsubscribeB();
  });

  it("repassa a mensagem recebida do redis para os listeners ativos", async () => {
    const { createEventBus } = await import("./events.js");
    const bus = createEventBus("redis://127.0.0.1:6379");

    const received: string[] = [];
    bus.subscribe((raw) => received.push(raw));
    await Promise.resolve();
    await Promise.resolve();

    const messageHandler = onMock.mock.calls.find(([event]) => event === "message")?.[1];
    expect(messageHandler).toBeTypeOf("function");
    messageHandler("vision-mind:events", '{"state":"idle"}');

    expect(received).toEqual(['{"state":"idle"}']);
  });

  it("close() encerra as duas conexoes", async () => {
    const { createEventBus } = await import("./events.js");
    const bus = createEventBus("redis://127.0.0.1:6379");

    await bus.close();
    expect(quitMock).toHaveBeenCalledTimes(2);
  });
});
