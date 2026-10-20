"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock } from "@/components/Clock";
import { Orb } from "@/components/Orb";
import { api, type JobStatus } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useEventSource } from "@/lib/useEventSource";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";

function speak(text: string) {
  if (!text || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  window.speechSynthesis.speak(utterance);
}

export default function HudPage() {
  useEventSource();

  const orbState = useAppStore((s) => s.orbState);
  const setOrbState = useAppStore((s) => s.setOrbState);
  const lastTranscript = useAppStore((s) => s.lastTranscript);
  const setLastTranscript = useAppStore((s) => s.setLastTranscript);
  const lastMessage = useAppStore((s) => s.lastMessage);
  const setLastMessage = useAppStore((s) => s.setLastMessage);

  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  const handleResult = useCallback(
    async (blob: Blob) => {
      setOrbState("working");
      try {
        const result = await api.voice(blob);

        if (result.kind === "audio") {
          setLastTranscript(result.transcript);
          setLastMessage(result.reply);

          const url = URL.createObjectURL(result.blob);
          const audio = new Audio(url);
          setOrbState("speaking");

          audio.onended = () => {
            setOrbState("idle");
            URL.revokeObjectURL(url);
          };

          try {
            await audio.play();
          } catch {
            // Autoplay bloqueado ou falha de reproducao: fala por speechSynthesis.
            URL.revokeObjectURL(url);
            speak(result.reply);
            setOrbState("idle");
          }
          return;
        }

        const data = result.data;
        setLastTranscript(data.transcript ?? "");
        if (data.mode === "queued") {
          setPendingJobId(data.jobId);
          setLastMessage(`Enviado para processamento (${data.route}).`);
        } else {
          setLastMessage(data.output);
          speak(data.output);
          setOrbState("idle");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao enviar o audio.";
        setLastMessage(message);
        setOrbState("error");
      }
    },
    [setOrbState, setLastTranscript, setLastMessage],
  );

  const handleCancelled = useCallback(() => setOrbState("idle"), [setOrbState]);
  const recorder = useVoiceRecorder(handleResult, handleCancelled);

  const handleTap = useCallback(async () => {
    if (recorder.isRecording) {
      recorder.cancel();
      return;
    }
    setLastMessage("");
    setLastTranscript("");
    setOrbState("listening");
    try {
      await recorder.start();
    } catch {
      setOrbState("error");
      setLastMessage("Nao foi possivel acessar o microfone.");
    }
  }, [recorder, setOrbState, setLastMessage, setLastTranscript]);

  // Acompanha um job enfileirado ate ele terminar, para mostrar o resultado
  // da skill aqui mesmo, sem precisar ir pra tela Jobs.
  useEffect(() => {
    if (!pendingJobId) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const job: JobStatus = await api.job(pendingJobId);
        if (job.state === "completed") {
          const output = job.returnvalue?.output ?? "Concluido.";
          setLastMessage(output);
          speak(output);
          setPendingJobId(null);
          return;
        }
        if (job.state === "failed") {
          setLastMessage(job.failedReason ?? "O job falhou.");
          setPendingJobId(null);
          return;
        }
      } catch {
        // erro de rede pontual no polling: tenta de novo na proxima rodada
      }
      if (attempts < 20 && !cancelled) setTimeout(poll, 3000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [pendingJobId, setLastMessage]);

  return (
    <div className="flex flex-col items-center gap-10">
      <Clock />
      <Orb state={orbState} />

      <button
        onClick={handleTap}
        className={`rounded-full border px-8 py-3 text-sm uppercase tracking-widest transition-colors ${
          recorder.isRecording
            ? "border-amber-glow text-amber-glow"
            : "border-edge text-neutral-300 hover:border-cyan-glow hover:text-cyan-glow"
        }`}
      >
        {recorder.isRecording ? "Esc para cancelar" : "Tap to talk"}
      </button>

      {(lastTranscript || lastMessage) && (
        <div className="w-full space-y-2 rounded-xl border border-edge bg-panel/60 p-4 text-sm">
          {lastTranscript && <p className="text-neutral-400">&ldquo;{lastTranscript}&rdquo;</p>}
          {lastMessage && <p className="text-neutral-100">{lastMessage}</p>}
        </div>
      )}
    </div>
  );
}
