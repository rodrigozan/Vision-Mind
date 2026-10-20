"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type SkillDefinition } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillDefinition[] | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const visibleSkills = useAppStore((s) => s.visibleSkills);

  useEffect(() => {
    api.skills().then(setSkills).catch(() => setSkills([]));
  }, []);

  const run = useCallback(async (name: string) => {
    setStatus((s) => ({ ...s, [name]: "enviando..." }));
    try {
      const result = await api.runSkill(name, inputs[name]?.trim() || undefined);
      if (result.mode === "queued") {
        setStatus((s) => ({ ...s, [name]: `job ${result.jobId} enfileirado` }));
      } else {
        setStatus((s) => ({ ...s, [name]: "respondido direto" }));
      }
    } catch {
      setStatus((s) => ({ ...s, [name]: "falhou ao enfileirar" }));
    }
  }, [inputs]);

  if (skills === null) {
    return <p className="text-sm text-neutral-500">Carregando skills...</p>;
  }

  const shown = skills.filter((skill) => (visibleSkills ? visibleSkills.includes(skill.name) : skill.button));

  if (shown.length === 0) {
    return (
      <div className="space-y-3 text-sm text-neutral-500">
        <p>Nenhuma skill visivel ainda.</p>
        <p>
          Crie um <code className="text-neutral-300">SKILL.md</code> em <code className="text-neutral-300">skills/</code>, ou
          escolha skills na tela{" "}
          <Link href="/settings" className="text-cyan-glow underline">
            Config
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {shown.map((skill) => (
        <div key={skill.name} className="space-y-2 rounded-xl border border-edge bg-panel/60 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-100">{skill.title}</span>
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">{skill.engine}</span>
          </div>
          <input
            value={inputs[skill.name] ?? ""}
            onChange={(e) => setInputs((s) => ({ ...s, [skill.name]: e.target.value }))}
            placeholder="pedido opcional..."
            className="w-full rounded-lg border border-edge bg-void px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-cyan-glow focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => run(skill.name)}
              className="rounded-lg border border-edge px-4 py-1.5 text-xs uppercase tracking-wide text-neutral-300 hover:border-cyan-glow hover:text-cyan-glow"
            >
              Rodar
            </button>
            {status[skill.name] && <span className="text-xs text-neutral-500">{status[skill.name]}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
