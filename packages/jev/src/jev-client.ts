import { ROUTES } from "./routes.js";

export interface JevClient {
  decide(text: string): Promise<string>;
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function buildSystemPrompt(): string {
  const lista = ROUTES.filter((route) => route.id !== "skill")
    .map((route) => `- ${route.id}: ${route.uso}`)
    .join("\n");

  return [
    "Voce e um roteador. Escolha exatamente uma rota da lista abaixo para o pedido do usuario.",
    lista,
    'Responda APENAS com o id da rota, sem nenhum texto adicional, sem explicacao e sem pontuacao.',
  ].join("\n\n");
}

export function createOpenRouterJevClient(apiKey: string, model: string, timeoutMs = 10000): JevClient {
  return {
    async decide(text: string): Promise<string> {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: text },
          ],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}
