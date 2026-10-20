import { open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { resolveInVault } from "./paths.js";

export interface VaultFile {
  path: string;
  content: string;
  revision: string;
}

function revision(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

const FOCO_PATH = join("memoria", "foco-da-semana.md");
const TODO_PATH = join("tasks", "todo.md");

/**
 * Le memoria/foco-da-semana.md. Nao cria o arquivo se faltar: no vault real
 * ele e mantido a mao (ou pelo /save), nunca gerado sob demanda - "nao existe
 * inbox, diario, pastas de fila ou processar depois" (constituicao do vault).
 */
export async function readFocoDaSemana(): Promise<VaultFile> {
  const path = FOCO_PATH;
  const content = await readFile(resolveInVault(path), "utf8");
  return { path, content, revision: revision(content) };
}

/**
 * Sobrescreve memoria/foco-da-semana.md. So deve ser chamada as segundas
 * (ver skill plan-today): nos outros dias, so leitura.
 */
export async function writeFocoDaSemana(content: string, expectedRevision: string): Promise<VaultFile> {
  if (!expectedRevision) throw new Error("revisao esperada obrigatoria");
  const path = FOCO_PATH;
  const target = resolveInVault(path);
  const lockPath = resolveInVault(".vision-mind-write.lock");
  const lock = await open(lockPath, "wx");
  let tempPath: string | undefined;
  try {
    const current = await readFile(target, "utf8");
    if (revision(current) !== expectedRevision) throw new Error("conflito: nota alterada desde a leitura");
    tempPath = resolveInVault(`.vision-mind-${randomUUID()}.tmp`);
    await writeFile(tempPath, content, { encoding: "utf8", flag: "wx" });
    await rename(tempPath, target);
    return { path, content, revision: revision(content) };
  } finally {
    await lock.close();
    await unlink(lockPath);
    if (tempPath) await unlink(tempPath).catch(() => {});
  }
}

/** Le tasks/todo.md, a fonte unica de tarefas do vault. Somente leitura. */
export async function readTodo(): Promise<VaultFile> {
  const path = TODO_PATH;
  const content = await readFile(resolveInVault(path), "utf8");
  return { path, content, revision: revision(content) };
}
