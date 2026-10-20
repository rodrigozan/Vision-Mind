import type { VoiceClient } from "./types.js";

interface SttResponse {
  text: string;
}

/** Cliente HTTP para o services/voice (Fase 4): POST /stt e POST /tts. */
export function createVoiceClient(baseUrl: string): VoiceClient {
  return {
    async transcribe(audio, filename, contentType) {
      const form = new FormData();
      form.append("file", new Blob([audio], { type: contentType || "application/octet-stream" }), filename);

      const response = await fetch(`${baseUrl}/stt`, { method: "POST", body: form });
      if (!response.ok) {
        throw new Error(`stt falhou: ${response.status} ${await response.text()}`);
      }

      const data = (await response.json()) as SttResponse;
      return data.text;
    },

    async synthesize(text, voice) {
      const response = await fetch(`${baseUrl}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!response.ok) {
        throw new Error(`tts falhou: ${response.status} ${await response.text()}`);
      }

      return Buffer.from(await response.arrayBuffer());
    },
  };
}
