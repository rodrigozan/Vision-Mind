import type { Engine, EngineId, EngineRequest, EngineResult } from "@vision-mind/engines";
import type { RouteId } from "@vision-mind/jev";
import type { ContextResult, VaultFile } from "@vision-mind/vault";
import type { SkillDefinition } from "@vision-mind/skills";
import type { EventState, JobData } from "@vision-mind/jobs";

export type { JobData };

export interface AskResponseDirect {
  mode: "direct";
  route: RouteId;
  tier: 2;
  engine: EngineId;
  output: string;
  durationMs: number;
}

export interface AskResponseQueued {
  mode: "queued";
  jobId: string;
  route: RouteId;
  tier: 1 | 3;
  engine: EngineId;
  skill?: string;
}

export type AskResponse = AskResponseDirect | AskResponseQueued;

export interface JobStatus {
  id: string;
  state: string;
  data: JobData;
  returnvalue?: unknown;
  failedReason?: string;
  timestamp?: number;
  processedOn?: number;
  finishedOn?: number;
}

export interface QueuePort {
  add(name: string, data: JobData): Promise<{ id: string }>;
  getJob(id: string): Promise<JobStatus | undefined>;
  /** Jobs recentes das duas filas, mais novo primeiro (para a tela Jobs do HUD). */
  list(limit?: number): Promise<JobStatus[]>;
}

/** Superficie minima da EngineRegistry de @vision-mind/engines usada pela API. */
export interface EngineRegistryLike {
  listIds(): EngineId[];
  getEngine(id: EngineId): Engine;
  fallbackChain(id: EngineId): EngineId[];
  runWithFallback(id: EngineId, req: EngineRequest): Promise<EngineResult>;
}

export interface SkillsPort {
  list(): Promise<SkillDefinition[]>;
}

export interface VaultPort {
  readFocoDaSemana(): Promise<VaultFile>;
  readScopedContext(scopeId: string, query: string): Promise<ContextResult>;
}

export interface VoiceClient {
  transcribe(audio: Buffer, filename: string, contentType: string): Promise<string>;
  synthesize(text: string, voice?: string): Promise<Buffer>;
}

export interface AppDeps {
  registry: EngineRegistryLike;
  queue: QueuePort;
  skills: SkillsPort;
  vault: VaultPort;
  voice: VoiceClient;
  publish: (state: EventState, extra?: Record<string, unknown>) => Promise<void> | void;
  subscribeEvents: (onMessage: (raw: string) => void) => () => void;
  apiToken: string;
}
