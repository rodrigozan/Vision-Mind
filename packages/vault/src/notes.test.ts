import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let vaultDir: string;

beforeEach(async () => {
  vaultDir = await mkdtemp(join(tmpdir(), "vision-mind-vault-notes-"));
  process.env.VAULT_PATH = vaultDir;
  vi.resetModules();
});

afterEach(async () => {
  await rm(vaultDir, { recursive: true, force: true });
});

describe("writeNote / readNote", () => {
  it("escreve e le uma nota com frontmatter", async () => {
    const { writeNote, readNote } = await import("./notes.js");

    const path = await writeNote("projetos", "Minha Nota de Teste", "Conteudo da nota.", {
      tags: ["teste"],
    });
    expect(path).toBe(join("projetos", "minha-nota-de-teste.md"));

    const note = await readNote(path);
    expect(note.content).toBe("Conteudo da nota.");
    expect(note.frontmatter.title).toBe("Minha Nota de Teste");
    expect(note.frontmatter.tags).toEqual(["teste"]);
  });

  it("cria as pastas intermediarias quando necessario", async () => {
    const { writeNote, readNote } = await import("./notes.js");

    const path = await writeNote("wiki/sub", "Outra Nota", "Texto.");
    const note = await readNote(path);
    expect(note.content).toBe("Texto.");
  });

  it("nao sobrescreve nota existente com mesmo titulo", async () => {
    const { writeNote, readNote } = await import("./notes.js");
    await writeNote("projetos", "Mesmo titulo", "primeira versao");
    await expect(writeNote("projetos", "Mesmo titulo", "segunda versao")).rejects.toThrow();
    expect((await readNote("projetos/mesmo-titulo.md")).content).toBe("primeira versao");
  });
});
