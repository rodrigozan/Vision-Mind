import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { env } from "@vision-mind/shared";
import { resolveInVault, vaultRoot } from "./paths.js";

const MAX_FILES = 12;
const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_TOTAL_CHARS = 12_000;
const MAX_SNIPPET_CHARS = 3_000;

interface Scope { id: string; kind: "client" | "profile"; files: string[] }
interface ScopeCatalog { scopes: Scope[] }

export interface ContextSource {
  path: string;
  revision: string;
  excerpt: string;
}

export interface ContextResult {
  scopeId: string;
  kind: Scope["kind"];
  sources: ContextSource[];
}

function inside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function loadScope(scopeId: string): Promise<Scope> {
  if (!env.CONTEXT_SCOPES_PATH) throw new Error("catalogo de escopos nao configurado");
  const catalog = JSON.parse(await readFile(resolve(process.cwd(), env.CONTEXT_SCOPES_PATH), "utf8")) as ScopeCatalog;
  if (!Array.isArray(catalog.scopes)) throw new Error("catalogo de escopos invalido");
  const scope = catalog.scopes.find((entry) => entry.id === scopeId);
  if (!scope || !["client", "profile"].includes(scope.kind) || !Array.isArray(scope.files)) {
    throw new Error("escopo desconhecido");
  }
  if (scope.files.length > MAX_FILES) throw new Error("escopo excede limite de arquivos");
  return scope;
}

function excerpt(content: string, query: string): string | null {
  const terms = (query.toLocaleLowerCase("pt-BR").match(/[\p{L}\p{N}]{2,}/gu) ?? [])
    .filter((term) => !["que", "como", "para", "qual", "quais", "sobre", "com", "uma", "por"].includes(term))
    .slice(0, 8);
  if (!terms.length) return null;
  const lower = content.toLocaleLowerCase("pt-BR");
  const positions = terms.map((term) => lower.indexOf(term)).filter((position) => position >= 0);
  if (!positions.length) return null;
  const start = Math.max(0, Math.min(...positions) - 300);
  return content.slice(start, start + MAX_SNIPPET_CHARS);
}

export async function readScopedContext(scopeId: string, query: string): Promise<ContextResult> {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 500) {
    throw new Error("consulta invalida");
  }
  const scope = await loadScope(scopeId);
  const realRoot = await realpath(vaultRoot);
  const sources: ContextSource[] = [];
  let remaining = MAX_TOTAL_CHARS;

  for (const path of scope.files) {
    if (typeof path !== "string" || !path.endsWith(".md") || isAbsolute(path)) {
      throw new Error("caminho de escopo invalido");
    }
    const target = resolveInVault(path);
    if (!inside(realRoot, await realpath(target))) throw new Error("link fora do vault");
    const raw = await readFile(target);
    if (raw.byteLength > MAX_SOURCE_BYTES) throw new Error("fonte excede limite de tamanho");
    const content = raw.toString("utf8");
    const snippet = excerpt(content, query);
    if (!snippet) continue;
    const limited = snippet.slice(0, remaining);
    if (!limited) break;
    sources.push({
      path,
      revision: `sha256:${createHash("sha256").update(raw).digest("hex")}`,
      excerpt: limited,
    });
    remaining -= limited.length;
  }
  return { scopeId: scope.id, kind: scope.kind, sources };
}
