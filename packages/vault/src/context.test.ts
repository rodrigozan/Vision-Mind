import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root: string;
let vault: string;
let catalog: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "vision-context-"));
  vault = join(root, "vault");
  catalog = join(root, "scopes.json");
  await mkdir(join(vault, "clientes", "a"), { recursive: true });
  await mkdir(join(vault, "clientes", "b"), { recursive: true });
  await writeFile(join(vault, "clientes", "a", "overview.md"), "Cliente A quer pesquisa de mercado.");
  await writeFile(join(vault, "clientes", "b", "overview.md"), "Cliente B quer pesquisa de produto.");
  await writeFile(catalog, JSON.stringify({ scopes: [{ id: "client:a", kind: "client", files: ["clientes/a/overview.md"] }] }));
  process.env.VAULT_PATH = vault;
  process.env.CONTEXT_SCOPES_PATH = catalog;
  vi.resetModules();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("readScopedContext", () => {
  it("retorna somente fonte permitida, trecho e revisao", async () => {
    const { readScopedContext } = await import("./context.js");
    const result = await readScopedContext("client:a", "pesquisa");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].path).toBe("clientes/a/overview.md");
    expect(result.sources[0].revision).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.sources[0].excerpt).toContain("Cliente A");
    expect(result.sources[0].excerpt).not.toContain("Cliente B");
    await expect(readScopedContext("client:b", "pesquisa")).rejects.toThrow("escopo desconhecido");
  });

  it("rejeita caminho fora do vault e link simbolico", async () => {
    const { readScopedContext } = await import("./context.js");
    await writeFile(catalog, JSON.stringify({ scopes: [{ id: "client:a", kind: "client", files: ["../fora.md"] }] }));
    await expect(readScopedContext("client:a", "pesquisa")).rejects.toThrow();
    await writeFile(join(root, "fora.md"), "pesquisa privada");
    await symlink(join(root, "fora.md"), join(vault, "clientes", "a", "link.md"));
    await writeFile(catalog, JSON.stringify({ scopes: [{ id: "client:a", kind: "client", files: ["clientes/a/link.md"] }] }));
    await expect(readScopedContext("client:a", "pesquisa")).rejects.toThrow("link fora do vault");
  });
});
