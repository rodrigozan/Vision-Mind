import { describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import type { AppDeps, EngineRegistryLike, JobStatus, QueuePort } from "./types.js";

function fakeRegistry(): EngineRegistryLike {
  return {
    listIds: () => ["claude-code", "openrouter"],
    getEngine: (id) => ({
      id,
      isAvailable: async () => id === "openrouter",
      run: async () => ({ engine: id, ok: true, output: "", durationMs: 0 }),
    }),
    fallbackChain: (id) => [id],
    runWithFallback: vi.fn(async (id) => ({ engine: id, ok: true, output: "resposta direta", durationMs: 3 })),
  };
}

function fakeQueue(jobs: Record<string, JobStatus> = {}): QueuePort {
  return {
    add: vi.fn(async () => ({ id: "job-99" })),
    getJob: vi.fn(async (id: string) => jobs[id]),
    list: vi.fn(async (limit?: number) => Object.values(jobs).slice(0, limit ?? 20)),
  };
}

async function buildTestApp(overrides: Partial<AppDeps> = {}): Promise<FastifyInstance> {
  const deps: AppDeps = {
    registry: fakeRegistry(),
    queue: fakeQueue({
      "job-existe": {
        id: "job-existe",
        state: "completed",
        data: { route: "code-heavy", tier: 3, engine: "claude-code", input: "refatora" },
      },
    }),
    skills: {
      list: async () => [
        { name: "plan-today", title: "Plan Today", engine: "claude-code", output: "foco-semana", button: true, dir: "plan-today", prompt: "Monte o plano do dia." },
      ],
    },
    vault: {
      readFocoDaSemana: async () => ({ path: "memoria/foco-da-semana.md", content: "**Semana de:** 2026-10-12\n", revision: "sha256:test" }),
      readScopedContext: async (scopeId, query) => ({ scopeId, kind: "client", sources: [{ path: "clientes/exemplo/overview.md", revision: "sha256:abc", excerpt: query }] }),
    },
    voice: { transcribe: vi.fn(), synthesize: vi.fn() },
    publish: vi.fn(),
    subscribeEvents: vi.fn(() => () => {}),
    apiToken: "segredo-de-teste",
    ...overrides,
  };

  return buildApp(deps);
}

const AUTH = { authorization: "Bearer segredo-de-teste" };

describe("app", () => {
  it("rejeita requisicoes sem o token de autenticacao", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/engines/status" });
    expect(response.statusCode).toBe(401);
  });

  it("POST /ask com override @router responde direto (tier 2)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ask",
      headers: AUTH,
      payload: { text: "@router quanto e 12 vezes 8" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ mode: "direct", tier: 2, engine: "openrouter", output: "resposta direta" });
  });

  it("POST /ask com override @claude enfileira um job (tier 3)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ask",
      headers: AUTH,
      payload: { text: "@claude refatora este modulo" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ mode: "queued", jobId: "job-99", route: "code-heavy", tier: 3 });
  });

  it("POST /ask com corpo invalido retorna 400", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "POST", url: "/ask", headers: AUTH, payload: {} });
    expect(response.statusCode).toBe(400);
  });

  it("GET /jobs/:id devolve o job quando existe e 404 quando nao existe", async () => {
    const app = await buildTestApp();

    const found = await app.inject({ method: "GET", url: "/jobs/job-existe", headers: AUTH });
    expect(found.statusCode).toBe(200);
    expect(found.json()).toMatchObject({ id: "job-existe", state: "completed" });

    const missing = await app.inject({ method: "GET", url: "/jobs/nao-existe", headers: AUTH });
    expect(missing.statusCode).toBe(404);
  });

  it("GET /jobs lista os jobs recentes (nao confunde com /jobs/:id)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/jobs", headers: AUTH });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { id: "job-existe", state: "completed", data: { route: "code-heavy", tier: 3, engine: "claude-code", input: "refatora" } },
    ]);
  });

  it("GET /skills lista as skills carregadas", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/skills", headers: AUTH });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { name: "plan-today", title: "Plan Today", engine: "claude-code", output: "foco-semana", button: true, dir: "plan-today", prompt: "Monte o plano do dia." },
    ]);
  });

  it("POST /skills/:name/run com skill inexistente retorna 404", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "POST", url: "/skills/nao-existe/run", headers: AUTH });
    expect(response.statusCode).toBe(404);
  });

  it("POST /skills/:name/run enfileira a skill encontrada", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "POST", url: "/skills/plan-today/run", headers: AUTH, payload: {} });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ mode: "queued", jobId: "job-99", skill: "plan-today", engine: "claude-code" });
  });

  it("GET /vault/today devolve o foco da semana", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/vault/today", headers: AUTH });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ path: "memoria/foco-da-semana.md" });
  });

  it("POST /context/search devolve fontes do escopo autorizado", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "POST", url: "/context/search", headers: AUTH, payload: { scopeId: "client:a", query: "pesquisa" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ scopeId: "client:a", sources: [{ revision: "sha256:abc", excerpt: "pesquisa" }] });
  });

  it("POST /context/search rejeita chamada sem token configurado", async () => {
    const app = await buildTestApp({ apiToken: "" });
    const response = await app.inject({ method: "POST", url: "/context/search", payload: { scopeId: "client:a", query: "pesquisa" } });
    expect(response.statusCode).toBe(503);
  });

  it("GET /engines/status devolve a disponibilidade de cada motor", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/engines/status", headers: AUTH });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { engine: "claude-code", available: false },
      { engine: "openrouter", available: true },
    ]);
  });
});
