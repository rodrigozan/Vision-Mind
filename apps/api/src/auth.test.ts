import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import { isAuthorized } from "./auth.js";

function fakeRequest(headers: Record<string, string> = {}, query: Record<string, unknown> = {}): FastifyRequest {
  return { headers, query } as unknown as FastifyRequest;
}

describe("isAuthorized", () => {
  it("libera tudo quando API_TOKEN esta vazio (modo dev)", () => {
    expect(isAuthorized(fakeRequest(), "")).toBe(true);
  });

  it("aceita o header Authorization: Bearer <token>", () => {
    const request = fakeRequest({ authorization: "Bearer segredo" });
    expect(isAuthorized(request, "segredo")).toBe(true);
  });

  it("rejeita header ausente ou com token errado", () => {
    expect(isAuthorized(fakeRequest(), "segredo")).toBe(false);
    expect(isAuthorized(fakeRequest({ authorization: "Bearer errado" }), "segredo")).toBe(false);
  });

  it("aceita o token via query param, para o EventSource do navegador", () => {
    const request = fakeRequest({}, { token: "segredo" });
    expect(isAuthorized(request, "segredo")).toBe(true);
  });

  it("rejeita query param com token errado", () => {
    const request = fakeRequest({}, { token: "errado" });
    expect(isAuthorized(request, "segredo")).toBe(false);
  });
});
