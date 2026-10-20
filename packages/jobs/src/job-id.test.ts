import { describe, expect, it } from "vitest";
import { decodeJobId, encodeJobId } from "./job-id.js";

describe("encodeJobId / decodeJobId", () => {
  it("codifica e decodifica ida e volta", () => {
    expect(encodeJobId("cli", "5")).toBe("cli:5");
    expect(decodeJobId("cli:5")).toEqual({ kind: "cli", rawId: "5" });
    expect(decodeJobId("openrouter:12")).toEqual({ kind: "openrouter", rawId: "12" });
  });

  it("retorna undefined para ids sem o prefixo esperado", () => {
    expect(decodeJobId("5")).toBeUndefined();
    expect(decodeJobId("outra-fila:5")).toBeUndefined();
  });
});
