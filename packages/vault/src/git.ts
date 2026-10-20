import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { simpleGit } from "simple-git";
import { createLogger, env } from "@vision-mind/shared";
import { resolveInVault, vaultRoot } from "./paths.js";

const log = createLogger("vault:git");

export interface CommitResult {
  committed: boolean;
  pushed: boolean;
}

async function ensureRepo() {
  const git = simpleGit(vaultRoot);

  // git.checkIsRepo() (sem argumento) verifica "esta dentro de uma arvore de
  // trabalho", subindo diretorios - se o cofre estiver dentro de outro repo
  // Git (ex.: este monorepo, em dev), ele responde true mesmo sem o cofre
  // ter seu proprio .git, e os commits do cofre acabam caindo no repo de
  // fora, cujo .gitignore pode ate rejeitar o proprio caminho do cofre.
  // Por isso checamos o .git do vaultRoot diretamente.
  if (!existsSync(join(vaultRoot, ".git"))) {
    await git.init();
    await git.addConfig("user.name", "Vision Mind");
    await git.addConfig("user.email", "vision-mind@local");
  }
  return git;
}

export async function commitAndPush(mensagem: string, paths: string[]): Promise<CommitResult> {
  if (!paths.length) throw new Error("arquivos do commit nao informados");
  const safePaths = paths.map((path) => relative(vaultRoot, resolveInVault(path)));
  if (safePaths.some((path) => !path || path === ".")) throw new Error("caminho de commit invalido");
  const git = await ensureRepo();
  await git.add(safePaths);

  const staged = await git.diff(["--cached", "--name-only", "--", ...safePaths]);
  if (!staged.trim()) {
    log.debug("nada para commitar");
    return { committed: false, pushed: false };
  }

  await git.commit(mensagem, safePaths);

  if (!env.VAULT_AUTO_PUSH || !env.VAULT_GIT_REMOTE) {
    return { committed: true, pushed: false };
  }

  const remotes = await git.getRemotes();
  if (!remotes.some((remote) => remote.name === "origin")) {
    await git.addRemote("origin", env.VAULT_GIT_REMOTE);
  }
  await git.push("origin", "HEAD");
  return { committed: true, pushed: true };
}
