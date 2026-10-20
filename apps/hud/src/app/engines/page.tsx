"use client";

import { useEffect, useState } from "react";
import { api, type EngineStatus } from "@/lib/api";

export default function EnginesPage() {
  const [engines, setEngines] = useState<EngineStatus[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () => api.engines().then(setEngines).catch(() => setError(true));
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <p className="text-sm text-red-glow">Nao foi possivel falar com a API.</p>;
  if (engines === null) return <p className="text-sm text-neutral-500">Carregando motores...</p>;

  return (
    <ul className="space-y-2">
      {engines.map((engine) => (
        <li
          key={engine.engine}
          className="flex items-center justify-between rounded-xl border border-edge bg-panel/60 px-4 py-3"
        >
          <span className="font-mono text-sm text-neutral-200">{engine.engine}</span>
          <span className="flex items-center gap-2 text-xs uppercase tracking-wide">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: engine.available ? "#4ade80" : "#ff5c5c" }}
            />
            <span className={engine.available ? "text-green-glow" : "text-red-glow"}>
              {engine.available ? "disponivel" : "indisponivel"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
