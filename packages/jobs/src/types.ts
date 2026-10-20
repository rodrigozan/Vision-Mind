import type { EngineId } from "@vision-mind/engines";
import type { RouteId } from "@vision-mind/jev";

/** Contrato de dados de um job na fila, compartilhado entre apps/api (produtor) e apps/worker (consumidor). */
export interface JobData {
  route: RouteId;
  tier: 1 | 3;
  engine: EngineId;
  input: string;
  skill?: string;
}

export interface JobResult {
  output: string;
  engine: EngineId;
  path?: string;
}
