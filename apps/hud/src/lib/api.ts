const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "";

export interface SkillDefinition {
  name: string;
  title: string;
  engine: string;
  fallback?: string;
  output: string;
  button: boolean;
  dir: string;
  prompt: string;
}

export interface EngineStatus {
  engine: string;
  available: boolean;
}

export interface VaultFile {
  path: string;
  content: string;
}

export interface JobStatus {
  id: string;
  state: string;
  data: { route: string; tier: 1 | 2 | 3; engine: string; input: string; skill?: string };
  returnvalue?: { output?: string; engine?: string; path?: string } | null;
  failedReason?: string;
  timestamp?: number;
  processedOn?: number;
  finishedOn?: number;
}

export interface AskResponseDirect {
  mode: "direct";
  route: string;
  tier: 2;
  engine: string;
  output: string;
  durationMs: number;
}

export interface AskResponseQueued {
  mode: "queued";
  jobId: string;
  route: string;
  tier: 1 | 3;
  engine: string;
  skill?: string;
}

export type AskResponse = AskResponseDirect | AskResponseQueued;

class ApiError extends Error {
  constructor(public status: number, public path: string) {
    super(`${path} -> ${status}`);
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new ApiError(res.status, path);
  return res;
}

function json(path: string, init?: RequestInit) {
  return request(path, init).then((res) => res.json());
}

export const api = {
  ask(text: string): Promise<AskResponse> {
    return json("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },

  async voice(
    blob: Blob,
  ): Promise<
    | { kind: "audio"; blob: Blob; transcript: string; reply: string }
    | { kind: "json"; data: AskResponse & { transcript?: string } }
  > {
    const form = new FormData();
    form.append("file", blob, "gravacao.webm");
    const res = await request("/voice", { method: "POST", body: form });
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.startsWith("audio/")) {
      const transcript = decodeURIComponent(res.headers.get("x-transcript") ?? "");
      const reply = decodeURIComponent(res.headers.get("x-reply") ?? "");
      return { kind: "audio", blob: await res.blob(), transcript, reply };
    }
    return { kind: "json", data: await res.json() };
  },

  skills(): Promise<SkillDefinition[]> {
    return json("/skills");
  },

  runSkill(name: string, input?: string): Promise<AskResponse> {
    return json(`/skills/${encodeURIComponent(name)}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
  },

  today(): Promise<VaultFile> {
    return json("/vault/today");
  },

  engines(): Promise<EngineStatus[]> {
    return json("/engines/status");
  },

  jobs(limit = 20): Promise<JobStatus[]> {
    return json(`/jobs?limit=${limit}`);
  },

  job(id: string): Promise<JobStatus> {
    return json(`/jobs/${encodeURIComponent(id)}`);
  },

  eventsUrl(): string {
    const params = API_TOKEN ? `?token=${encodeURIComponent(API_TOKEN)}` : "";
    return `${API_URL}/events${params}`;
  },
};
