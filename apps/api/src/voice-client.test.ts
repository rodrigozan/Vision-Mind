import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVoiceClient } from "./voice-client.js";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createVoiceClient", () => {
  it("transcribe envia o audio como multipart e devolve o texto", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ text: "ola mundo" }) });

    const client = createVoiceClient("http://127.0.0.1:8001");
    const text = await client.transcribe(Buffer.from("audio-falso"), "fala.webm", "audio/webm");

    expect(text).toBe("ola mundo");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8001/stt");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("transcribe lanca erro quando o servico de voz responde com falha", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => "arquivo de audio vazio" });

    const client = createVoiceClient("http://127.0.0.1:8001");
    await expect(client.transcribe(Buffer.from(""), "fala.webm", "audio/webm")).rejects.toThrow(
      "stt falhou: 400 arquivo de audio vazio",
    );
  });

  it("synthesize envia JSON e devolve o audio como Buffer", async () => {
    const wavBytes = new Uint8Array([1, 2, 3]);
    fetchMock.mockResolvedValue({ ok: true, arrayBuffer: async () => wavBytes.buffer });

    const client = createVoiceClient("http://127.0.0.1:8001");
    const audio = await client.synthesize("ola", "pf_dora");

    expect(audio).toBeInstanceOf(Buffer);
    expect([...audio]).toEqual([1, 2, 3]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8001/tts");
    expect(JSON.parse(options.body)).toEqual({ text: "ola", voice: "pf_dora" });
  });
});
