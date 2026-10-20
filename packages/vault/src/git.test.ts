import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let vaultDir: string;

beforeEach(async () => {
  vaultDir = await mkdtemp(join(tmpdir(), "vision-mind-vault-git-"));
  process.env.VAULT_PATH = vaultDir;
  process.env.VAULT_AUTO_PUSH = "false";
  process.env.VAULT_GIT_REMOTE = "";
  vi.resetModules();
});

afterEach(async () => {
  await rm(vaultDir, { recursive: true, force: true });
});

describe("commitAndPush", () => {
  it("inicializa o repo e cria o primeiro commit", async () => {
    await writeFile(join(vaultDir, "nota.md"), "conteudo");
    const { commitAndPush } = await import("./git.js");

    const result = await commitAndPush("primeiro commit de teste", ["nota.md"]);
    expect(result.committed).toBe(true);
    expect(result.pushed).toBe(false);

    const log = await simpleGit(vaultDir).log();
    expect(log.latest?.message).toBe("primeiro commit de teste");
  });

  it("nao cria commit vazio quando nao ha mudancas", async () => {
    await writeFile(join(vaultDir, "nota.md"), "conteudo");
    const { commitAndPush } = await import("./git.js");

    await commitAndPush("primeiro commit", ["nota.md"]);
    const second = await commitAndPush("segundo commit sem mudancas", ["nota.md"]);
    expect(second.committed).toBe(false);
  });

  it("commita somente o caminho informado", async () => {
    await writeFile(join(vaultDir, "permitida.md"), "nova nota");
    await writeFile(join(vaultDir, "alheia.md"), "outra alteracao");
    const { commitAndPush } = await import("./git.js");
    await commitAndPush("nota permitida", ["permitida.md"]);
    const git = simpleGit(vaultDir);
    const files = await git.show(["--pretty=format:", "--name-only", "HEAD"]);
    expect(files).toContain("permitida.md");
    expect(files).not.toContain("alheia.md");
    expect((await git.status()).not_added).toContain("alheia.md");
  });

  it("funciona quando o cofre fica dentro de outro repo Git cujo .gitignore exclui o proprio caminho do cofre", async () => {
    // Regressao: checkIsRepo() sem argumento verifica "esta dentro de uma
    // arvore de trabalho" (sobe diretorios), nao "este caminho e a raiz de
    // um repo". Sem o .git proprio do cofre ainda, isso confundia o cofre
    // com o repo de fora, e git add . caia no .gitignore do repo de fora.
    const outerDir = vaultDir;
    const nestedVault = join(outerDir, "vault-dev");
    await mkdir(nestedVault, { recursive: true });
    await writeFile(join(outerDir, ".gitignore"), "vault-dev/\n");

    const outerGit = simpleGit(outerDir);
    await outerGit.init();
    await outerGit.addConfig("user.name", "Outro Repo");
    await outerGit.addConfig("user.email", "outro@local");
    await writeFile(join(outerDir, "README.md"), "repo de fora");
    await outerGit.add(".");
    await outerGit.commit("primeiro commit do repo de fora");

    process.env.VAULT_PATH = nestedVault;
    vi.resetModules();
    const { commitAndPush } = await import("./git.js");

    await writeFile(join(nestedVault, "nota.md"), "conteudo do cofre");
    const result = await commitAndPush("primeiro commit do cofre", ["nota.md"]);

    expect(result.committed).toBe(true);
    const nestedLog = await simpleGit(nestedVault).log();
    expect(nestedLog.latest?.message).toBe("primeiro commit do cofre");
  });
});
