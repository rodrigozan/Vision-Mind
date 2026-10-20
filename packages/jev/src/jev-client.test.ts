import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenRouterJevClient } from "./jev-client.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("createOpenRouterJevClient", () => {
  it("envia o pedido e a lista de rotas, e devolve o conteudo da resposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "code-fast" } }] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = createOpenRouterJevClient("chave", "modelo-jev");
    const resultado = await client.decide("corrige esse bug");

    expect(resultado).toBe("code-fast");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer chave");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("modelo-jev");
    expect(body.messages[1]).toEqual({ role: "user", content: "corrige esse bug" });
    expect(body.messages[0].content).toContain("code-fast");
  });

  it("lanca erro quando a resposta HTTP nao e ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    }) as unknown as typeof fetch;

    const client = createOpenRouterJevClient("chave-invalida", "modelo-jev");
    await expect(client.decide("qualquer coisa")).rejects.toThrow(/401/);
  });
});
