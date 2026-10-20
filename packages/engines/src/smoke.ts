import { EngineRegistry } from "./registry.js";

const prompt = "Responda apenas com a palavra: ok";

interface Row {
  engine: string;
  available: boolean;
  ok: boolean;
  durationMs: number;
  error?: string;
}

async function main() {
  const registry = new EngineRegistry();
  const rows: Row[] = [];

  for (const id of registry.listIds()) {
    const engine = registry.getEngine(id);
    const available = await engine.isAvailable();

    if (!available) {
      rows.push({ engine: id, available, ok: false, durationMs: 0 });
      continue;
    }

    const result = await engine.run({ prompt, timeoutMs: 30000 });
    rows.push({ engine: id, available, ok: result.ok, durationMs: result.durationMs, error: result.error });
  }

  const width = Math.max(...rows.map((r) => r.engine.length), "motor".length);
  console.log(["motor".padEnd(width), "disponivel", "sucesso", "tempo(ms)"].join("  "));
  for (const r of rows) {
    const line = [
      r.engine.padEnd(width),
      String(r.available).padEnd(10),
      String(r.ok).padEnd(7),
      String(r.durationMs),
    ].join("  ");
    console.log(r.error ? `${line}  (${r.error})` : line);
  }
}

main();
