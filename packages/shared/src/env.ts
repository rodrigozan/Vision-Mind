import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

function findEnvFile(startDir: string): string | undefined {
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const envFile = findEnvFile(process.cwd());
loadDotenv({ quiet: true, ...(envFile ? { path: envFile } : {}) });

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().default(3001),
  HUD_PORT: z.coerce.number().default(3000),
  API_TOKEN: z.string().default(""),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  VOICE_URL: z.string().default("http://127.0.0.1:8001"),
  VAULT_PATH: z.string().default("./vault-dev"),
  CONTEXT_SCOPES_PATH: z.string().default(""),
  VAULT_GIT_REMOTE: z.string().default(""),
  VAULT_AUTO_PUSH: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  VAULT_AUTOMATED_WRITES: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SKILLS_PATH: z.string().default("./skills"),
  OPENROUTER_API_KEY: z.string().default(""),
  JEV_ENABLED: z.coerce.boolean().default(true),
  JEV_MODEL: z.string().default("openrouter/auto"),
  QUICK_ANSWER_MODEL: z.string().default("openrouter/auto"),
  TZ: z.string().default("America/Sao_Paulo"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
