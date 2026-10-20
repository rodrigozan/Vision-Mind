import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let vaultDir: string;

beforeEach(async () => {
  vaultDir = await mkdtemp(join(tmpdir(), "vision-mind-vault-foco-"));
  process.env.VAULT_PATH = vaultDir;
  vi.resetModules();
});

afterEach(async () => {
  await rm(vaultDir, { recursive: true, force: true });
});

describe("readFocoDaSemana", () => {
  it("le o conteudo de memoria/foco-da-semana.md", async () => {
    await mkdir(join(vaultDir, "memoria"), { recursive: true });
    await writeFile(join(vaultDir, "memoria", "foco-da-semana.md"), "# Foco da Semana\n\n**Semana de:** 2026-10-12\n");

    const { readFocoDaSemana } = await import("./foco.js");
    const result = await readFocoDaSemana();

    expect(result.path).toBe(join("memoria", "foco-da-semana.md"));
    expect(result.content).toContain("Semana de:");
  });

  it("propaga o erro quando o arquivo nao existe (nao cria sob demanda)", async () => {
    const { readFocoDaSemana } = await import("./foco.js");
    await expect(readFocoDaSemana()).rejects.toThrow();
  });
});

describe("writeFocoDaSemana", () => {
  it("sobrescreve o arquivo existente", async () => {
    await mkdir(join(vaultDir, "memoria"), { recursive: true });
    await writeFile(join(vaultDir, "memoria", "foco-da-semana.md"), "versao antiga");

    const { writeFocoDaSemana, readFocoDaSemana } = await import("./foco.js");
    const original = await readFocoDaSemana();
    await writeFocoDaSemana("versao nova", original.revision);

    const reread = await readFocoDaSemana();
    expect(reread.content).toBe("versao nova");
    await expect(writeFocoDaSemana("versao antiga", original.revision)).rejects.toThrow("conflito");
  });
});

describe("readTodo", () => {
  it("le o conteudo de tasks/todo.md", async () => {
    await mkdir(join(vaultDir, "tasks"), { recursive: true });
    await writeFile(join(vaultDir, "tasks", "todo.md"), "## Esta semana\n- [ ] algo\n");

    const { readTodo } = await import("./foco.js");
    const result = await readTodo();

    expect(result.path).toBe(join("tasks", "todo.md"));
    expect(result.content).toContain("- [ ] algo");
  });
});
