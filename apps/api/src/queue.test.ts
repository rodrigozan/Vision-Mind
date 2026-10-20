import { beforeEach, describe, expect, it, vi } from "vitest";

const instances = new Map<
  string,
  { add: ReturnType<typeof vi.fn>; getJob: ReturnType<typeof vi.fn>; getJobs: ReturnType<typeof vi.fn> }
>();

const QueueMock = vi.fn().mockImplementation((name: string) => {
  const instance = { add: vi.fn(), getJob: vi.fn(), getJobs: vi.fn().mockResolvedValue([]) };
  instances.set(name, instance);
  return instance;
});

vi.mock("bullmq", () => ({ Queue: QueueMock }));

beforeEach(() => {
  instances.clear();
  QueueMock.mockClear();
});

describe("createQueue", () => {
  it("cria uma fila 'cli' e uma 'openrouter', sem ':' no nome", async () => {
    const { createQueue } = await import("./queue.js");
    const { QUEUE_NAMES } = await import("@vision-mind/jobs");

    createQueue({} as never);

    expect(QueueMock).toHaveBeenCalledWith(QUEUE_NAMES.cli, { connection: {} });
    expect(QueueMock).toHaveBeenCalledWith(QUEUE_NAMES.openrouter, { connection: {} });
    expect(QUEUE_NAMES.cli).not.toContain(":");
    expect(QUEUE_NAMES.openrouter).not.toContain(":");
  });

  it("add() manda motor CLI para a fila cli e prefixa o id devolvido", async () => {
    const { createQueue } = await import("./queue.js");
    const { QUEUE_NAMES } = await import("@vision-mind/jobs");
    const queue = createQueue({} as never);

    instances.get(QUEUE_NAMES.cli)!.add.mockResolvedValue({ id: "7" });

    const job = await queue.add("code-heavy", {
      route: "code-heavy",
      tier: 3,
      engine: "claude-code",
      input: "refatora isso",
    });

    expect(job).toEqual({ id: "cli:7" });
    expect(instances.get(QUEUE_NAMES.cli)!.add).toHaveBeenCalledWith("code-heavy", {
      route: "code-heavy",
      tier: 3,
      engine: "claude-code",
      input: "refatora isso",
    });
    expect(instances.get(QUEUE_NAMES.openrouter)!.add).not.toHaveBeenCalled();
  });

  it("add() manda motor openrouter para a fila openrouter", async () => {
    const { createQueue } = await import("./queue.js");
    const { QUEUE_NAMES } = await import("@vision-mind/jobs");
    const queue = createQueue({} as never);

    instances.get(QUEUE_NAMES.openrouter)!.add.mockResolvedValue({ id: "3" });

    const job = await queue.add("vault-write", {
      route: "vault-write",
      tier: 3,
      engine: "openrouter",
      input: "anota isso",
    });

    expect(job).toEqual({ id: "openrouter:3" });
  });

  it("getJob() retorna undefined para um id sem prefixo de fila valido", async () => {
    const { createQueue } = await import("./queue.js");
    const queue = createQueue({} as never);

    expect(await queue.getJob("7")).toBeUndefined();
    expect(await queue.getJob("fila-invalida:7")).toBeUndefined();
  });

  it("getJob() busca na fila certa e mapeia estado e dados", async () => {
    const { createQueue } = await import("./queue.js");
    const { QUEUE_NAMES } = await import("@vision-mind/jobs");
    const queue = createQueue({} as never);

    instances.get(QUEUE_NAMES.cli)!.getJob.mockResolvedValue({
      id: "7",
      data: { route: "code-heavy", tier: 3, engine: "claude-code", input: "oi" },
      returnvalue: { ok: true },
      failedReason: undefined,
      getState: vi.fn().mockResolvedValue("completed"),
    });

    expect(await queue.getJob("cli:7")).toEqual({
      id: "cli:7",
      state: "completed",
      data: { route: "code-heavy", tier: 3, engine: "claude-code", input: "oi" },
      returnvalue: { ok: true },
      failedReason: undefined,
    });
    expect(instances.get(QUEUE_NAMES.openrouter)!.getJob).not.toHaveBeenCalled();
  });

  it("list() junta as duas filas, ordena do mais novo pro mais antigo e respeita o limite", async () => {
    const { createQueue } = await import("./queue.js");
    const { QUEUE_NAMES } = await import("@vision-mind/jobs");
    const queue = createQueue({} as never);

    function fakeJob(id: string, timestamp: number, state: string) {
      return {
        id,
        data: { route: "code-heavy", tier: 3, engine: "claude-code", input: "x" },
        returnvalue: undefined,
        failedReason: undefined,
        timestamp,
        getState: vi.fn().mockResolvedValue(state),
      };
    }

    instances.get(QUEUE_NAMES.cli)!.getJobs.mockResolvedValue([fakeJob("1", 1000, "completed"), fakeJob("2", 3000, "active")]);
    instances.get(QUEUE_NAMES.openrouter)!.getJobs.mockResolvedValue([fakeJob("1", 2000, "completed")]);

    const jobs = await queue.list(2);

    expect(jobs.map((job) => job.id)).toEqual(["cli:2", "openrouter:1"]);
    expect(instances.get(QUEUE_NAMES.cli)!.getJobs).toHaveBeenCalledWith(
      ["completed", "active", "waiting", "failed", "delayed"],
      0,
      1,
    );
  });
});
