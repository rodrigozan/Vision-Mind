import { describe, expect, it } from "vitest";
import { isRouteId, ROUTES, ROUTES_BY_ID } from "./routes.js";

describe("routes.json", () => {
  it("carrega as 7 rotas fixas do roteiro", () => {
    expect(ROUTES.map((route) => route.id).sort()).toEqual(
      ["code-cheap", "code-fast", "code-heavy", "quick-answer", "research-agent", "skill", "vault-write"].sort(),
    );
  });

  it("so a rota skill tem motor nulo (definido pela skill, nao por uma lista fixa)", () => {
    for (const route of ROUTES) {
      if (route.id === "skill") {
        expect(route.engine).toBeNull();
      } else {
        expect(route.engine).not.toBeNull();
      }
    }
  });

  it("ROUTES_BY_ID indexa pelo id", () => {
    expect(ROUTES_BY_ID["code-fast"]?.engine).toBe("codex");
  });

  it("isRouteId valida ids conhecidos e rejeita o resto", () => {
    expect(isRouteId("quick-answer")).toBe(true);
    expect(isRouteId("rota-inventada")).toBe(false);
  });
});
