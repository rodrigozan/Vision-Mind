"use client";

import { useEffect } from "react";
import { api } from "./api";
import { useAppStore, type OrbEvent } from "./store";

/**
 * Assina GET /events (SSE) e mantem o orbState do store sincronizado com o
 * que a API/worker realmente estao fazendo. E a fonte de verdade: qualquer
 * mudanca otimista feita localmente (ex.: "listening" ao gravar) acaba sendo
 * confirmada ou corrigida pelo proximo evento que chegar daqui.
 */
export function useEventSource(): void {
  const setLastEvent = useAppStore((s) => s.setLastEvent);

  useEffect(() => {
    const source = new EventSource(api.eventsUrl());

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as OrbEvent;
        setLastEvent(event);
      } catch {
        // ignora mensagens que nao sao JSON valido
      }
    };

    return () => source.close();
  }, [setLastEvent]);
}
