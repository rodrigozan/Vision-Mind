import type { EngineId, EngineRequest, EngineResult } from "@vision-mind/engines";
import type { EventState } from "@vision-mind/jobs";
import type { SkillDefinition } from "@vision-mind/skills";
import type { CommitResult, VaultFile } from "@vision-mind/vault";

export interface EngineRunner {
  runWithFallback(id: EngineId, req: EngineRequest): Promise<EngineResult>;
}

export interface SkillsPort {
  list(): Promise<SkillDefinition[]>;
}

export interface VaultPort {
  readFocoDaSemana(): Promise<VaultFile>;
  writeFocoDaSemana(content: string, expectedRevision: string): Promise<VaultFile>;
  readTodo(): Promise<VaultFile>;
  writeNote(pasta: string, titulo: string, conteudo: string, frontmatter?: Record<string, unknown>): Promise<string>;
  commitAndPush(mensagem: string, paths: string[]): Promise<CommitResult>;
}

export interface WorkerDeps {
  registry: EngineRunner;
  skills: SkillsPort;
  vault: VaultPort;
  publish: (state: EventState, extra?: Record<string, unknown>) => Promise<void> | void;
  /** Diretório de execução separado do vault; contexto chega por leitura autorizada. */
  executionRoot: string;
  allowVaultWrites: boolean;
}
