import { describe, expect, it } from "vitest";
import { keywordRoute } from "./keywords.js";

describe("keywordRoute", () => {
  it.each([
    ["corrige esse bug no script", "code-fast"],
    ["refatora a arquitetura do worker", "code-heavy"],
    ["faz isso em lote nesses arquivos", "code-cheap"],
    ["pesquisa os concorrentes", "research-agent"],
    ["anota essa ideia no cofre", "vault-write"],
    ["oi, bom dia", "quick-answer"],
  ] as const)("classifica \"%s\" como %s", (texto, rotaEsperada) => {
    expect(keywordRoute(texto)).toBe(rotaEsperada);
  });
});
