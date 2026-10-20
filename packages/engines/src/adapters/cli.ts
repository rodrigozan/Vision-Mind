import { execa } from "execa";
import type { EngineConfig } from "../config.js";
import type { Engine, EngineId, EngineRequest, EngineResult } from "../types.js";

export function createCliEngine(id: EngineId, config: EngineConfig): Engine {
  const command = config.command;

  return {
    id,
    async isAvailable(): Promise<boolean> {
      if (!command) return false;
      const result = await execa(command, config.versionArgs, {
        reject: false,
        timeout: 5000,
        stdin: "ignore",
      });
      return !result.failed && !result.timedOut;
    },
    async run(req: EngineRequest): Promise<EngineResult> {
      const start = Date.now();
      if (!command) {
        return { engine: id, ok: false, output: "", durationMs: 0, error: `engine ${id} sem "command" em engines.config.json` };
      }

      const args = config.args.map((arg) => (arg === "{prompt}" ? req.prompt : arg));

      try {
        const result = await execa(command, args, {
          cwd: req.cwd ?? process.cwd(),
          timeout: req.timeoutMs ?? config.timeoutMs,
          reject: false,
          stdin: "ignore",
        });
        const durationMs = Date.now() - start;

        if (result.failed || result.timedOut) {
          return {
            engine: id,
            ok: false,
            output: result.stdout ?? "",
            durationMs,
            error: result.timedOut ? "timeout" : (result.stderr?.toString() || `exit code ${result.exitCode}`),
          };
        }

        return { engine: id, ok: true, output: (result.stdout ?? "").toString(), durationMs };
      } catch (error) {
        return {
          engine: id,
          ok: false,
          output: "",
          durationMs: Date.now() - start,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
