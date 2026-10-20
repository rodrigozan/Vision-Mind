type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel: Level = (process.env.LOG_LEVEL as Level) ?? "info";

function log(level: Level, scope: string, message: string, extra?: unknown) {
  if (order[level] < order[minLevel]) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}] ${message}`;
  const out = level === "error" ? console.error : console.log;
  if (extra !== undefined) out(line, extra);
  else out(line);
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, extra?: unknown) => log("debug", scope, message, extra),
    info: (message: string, extra?: unknown) => log("info", scope, message, extra),
    warn: (message: string, extra?: unknown) => log("warn", scope, message, extra),
    error: (message: string, extra?: unknown) => log("error", scope, message, extra),
  };
}

export type Logger = ReturnType<typeof createLogger>;
