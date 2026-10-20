import type { EngineId } from "@vision-mind/engines";

export interface EngineAvailability {
  fallbackChain(id: EngineId): EngineId[];
  getEngine(id: EngineId): { isAvailable(): Promise<boolean> };
}

export async function resolveAvailableEngine(engineId: EngineId, registry?: EngineAvailability): Promise<EngineId> {
  if (!registry) return engineId;

  for (const candidate of registry.fallbackChain(engineId)) {
    if (await registry.getEngine(candidate).isAvailable()) {
      return candidate;
    }
  }

  return engineId;
}
