import type { EngineId } from "@vision-mind/engines";
import type { JobData, JobResult } from "@vision-mind/jobs";
import { findSkill, type SkillDefinition } from "@vision-mind/skills";
import { buildSkillPrompt, type VaultContext } from "./prompt.js";
import type { WorkerDeps } from "./types.js";

const DESTINO_LINE = /^DESTINO:\s*(.+?)\s*\n+/;

/**
 * content-cascade decide em tempo real se o conteudo e da PhanterAI
 * (negocio/conteudo) ou de um cliente especifico (clientes/<slug>/conteudo).
 * A skill e instruida a declarar isso na primeira linha da resposta
 * ("DESTINO: <pasta>"); essa linha e extraida e nunca vai pro arquivo final.
 */
function extractDestino(output: string, fallback: string): { pasta: string; content: string } {
  const match = output.match(DESTINO_LINE);
  if (!match) return { pasta: fallback, content: output };
  const pasta = match[1].trim();
  if (pasta !== "negocio/conteudo" && !/^clientes\/[a-z0-9-]+\/conteudo$/.test(pasta)) {
    throw new Error("destino de conteudo nao autorizado");
  }
  return { pasta, content: output.slice(match[0].length) };
}

async function saveSkillResult(
  skill: SkillDefinition,
  output: string,
  engine: EngineId,
  isMonday: boolean,
  expectedFocoRevision: string | undefined,
  deps: WorkerDeps,
): Promise<JobResult> {
  // inbox-brief e similares: so resumo falado/na HUD, nada e gravado (nao existe inbox no vault).
  if (skill.output === "none") {
    return { output, engine };
  }
  if (!deps.allowVaultWrites) throw new Error("escrita automatica no vault desabilitada");

  // plan-today: so reescreve memoria/foco-da-semana.md as segundas; nos outros dias so leu e devolveu.
  if (skill.output === "foco-semana") {
    if (!isMonday) return { output, engine };
    if (!expectedFocoRevision) throw new Error("revisao do foco nao disponivel");
    const file = await deps.vault.writeFocoDaSemana(output, expectedFocoRevision);
    await deps.vault.commitAndPush(`skill: ${skill.name}`, [file.path]);
    return { output, engine, path: file.path };
  }

  // content-cascade: pasta real vem da linha "DESTINO:" que a skill devolve.
  if (skill.output === "conteudo") {
    const { pasta, content } = extractDestino(output, "negocio/conteudo");
    const title = `${skill.title} ${new Date().toISOString().slice(0, 10)}`;
    const path = await deps.vault.writeNote(pasta, title, content, { skill: skill.name, engine });
    await deps.vault.commitAndPush(`skill: ${skill.name}`, [path]);
    return { output: content, engine, path };
  }

  const title = `${skill.title} ${new Date().toISOString().slice(0, 10)}`;
  const path = await deps.vault.writeNote(skill.output, title, output, { skill: skill.name, engine });
  await deps.vault.commitAndPush(`skill: ${skill.name}`, [path]);
  return { output, engine, path };
}

/**
 * Logica pura de execucao de um job: roda a skill (quando houver) ou o
 * pedido de codigo direto, salva o resultado no cofre quando for skill, e
 * publica os estados de working/idle/error. Sem nenhuma dependencia do
 * BullMQ, para ser testavel com motores e cofre falsos.
 */
export function createProcessor(deps: WorkerDeps) {
  return async function processJob(data: JobData): Promise<JobResult> {
    await deps.publish("working", { route: data.route, engine: data.engine, skill: data.skill });

    try {
      if (data.skill) {
        const skill = findSkill(await deps.skills.list(), data.skill);
        if (!skill) {
          throw new Error(`skill "${data.skill}" nao encontrada`);
        }

        const today = new Date();
        const [foco, todo] = await Promise.all([deps.vault.readFocoDaSemana(), deps.vault.readTodo()]);
        const context: VaultContext = { foco, todo, today };
        const prompt = buildSkillPrompt(skill, context, data.input);

        const result = await deps.registry.runWithFallback(data.engine, { prompt, cwd: deps.executionRoot });
        if (!result.ok) {
          throw new Error(result.error ?? `motor ${result.engine} falhou`);
        }

        const isMonday = today.getDay() === 1;
        const jobResult = await saveSkillResult(skill, result.output, result.engine, isMonday, foco.revision, deps);
        await deps.publish("idle");
        return jobResult;
      }

      const result = await deps.registry.runWithFallback(data.engine, { prompt: data.input, cwd: deps.executionRoot });
      if (!result.ok) {
        throw new Error(result.error ?? `motor ${result.engine} falhou`);
      }

      await deps.publish("idle");
      return { output: result.output, engine: result.engine };
    } catch (error) {
      await deps.publish("error", { message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };
}
