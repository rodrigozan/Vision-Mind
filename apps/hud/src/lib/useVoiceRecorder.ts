"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SILENCE_THRESHOLD = 0.02;
const SILENCE_DURATION_MS = 1200;
const MAX_DURATION_MS = 60_000;

export interface UseVoiceRecorderResult {
  isRecording: boolean;
  start: () => Promise<void>;
  cancel: () => void;
}

/**
 * Grava audio do microfone e encerra sozinho apos uma pausa (silencio
 * continuo depois de ter detectado fala), ou no limite de seguranca de 60s.
 * Esc cancela sem enviar nada. Ver Fase 7 do roteiro.
 */
export function useVoiceRecorder(onResult: (blob: Blob) => void, onCancelled?: () => void): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const stop = useCallback((cancelled: boolean) => {
    cancelledRef.current = cancelled;
    mediaRecorderRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    if (mediaRecorderRef.current) stop(true);
  }, [stop]);

  const start = useCallback(async () => {
    if (mediaRecorderRef.current) return;

    cancelledRef.current = false;
    hasSpokenRef.current = false;
    silenceStartRef.current = null;
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const cancelled = cancelledRef.current;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      cleanup();
      if (cancelled) onCancelled?.();
      else onResult(blob);
    };

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);

    startedAtRef.current = Date.now();

    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);
      let sumSquares = 0;
      for (const sample of buffer) sumSquares += sample * sample;
      const rms = Math.sqrt(sumSquares / buffer.length);
      const now = Date.now();

      if (rms > SILENCE_THRESHOLD) {
        hasSpokenRef.current = true;
        silenceStartRef.current = null;
      } else if (hasSpokenRef.current) {
        if (silenceStartRef.current === null) silenceStartRef.current = now;
        if (now - silenceStartRef.current > SILENCE_DURATION_MS) {
          stop(false);
          return;
        }
      }

      if (now - startedAtRef.current > MAX_DURATION_MS) {
        stop(false);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    recorder.start();
    setIsRecording(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [cleanup, onResult, onCancelled, stop]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") cancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel]);

  useEffect(() => cleanup, [cleanup]);

  return { isRecording, start, cancel };
}
