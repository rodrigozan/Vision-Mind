import type { FastifyInstance } from "fastify";
import { handleAsk } from "../ask-handler.js";
import type { AppDeps } from "../types.js";

export function registerVoiceRoute(app: FastifyInstance, deps: AppDeps): void {
  app.post("/voice", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: "arquivo de audio ausente" });
    }

    await deps.publish("listening");
    const audio = await file.toBuffer();
    const text = await deps.voice.transcribe(audio, file.filename, file.mimetype);

    const skills = await deps.skills.list();
    const result = await handleAsk({
      text,
      registry: deps.registry,
      queue: deps.queue,
      skills: skills.map((skill) => ({ name: skill.name, engine: skill.engine })),
      publish: deps.publish,
    });

    if (result.mode === "direct") {
      await deps.publish("speaking");
      const audioOut = await deps.voice.synthesize(result.output);
      await deps.publish("idle");
      return reply
        .header("x-transcript", encodeURIComponent(text))
        // Texto da resposta, para o HUD mostrar e ter o que falar via
        // speechSynthesis quando a reproducao do audio falhar (Fase 7).
        // Truncado por seguranca: headers HTTP tem limite de tamanho e o
        // Tier 2 e feito pra respostas curtas mesmo.
        .header("x-reply", encodeURIComponent(result.output.slice(0, 4000)))
        .header("x-route", result.route)
        .header("x-engine", result.engine)
        .type("audio/wav")
        .send(audioOut);
    }

    await deps.publish("idle");
    return reply.send({ ...result, transcript: text });
  });
}
