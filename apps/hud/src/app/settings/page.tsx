"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type SkillDefinition } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function SettingsPage() {
  const [skills, setSkills] = useState<SkillDefinition[] | null>(null);
  const visibleSkills = useAppStore((s) => s.visibleSkills);
  const toggleSkill = useAppStore((s) => s.toggleSkill);
  const setVisibleSkills = useAppStore((s) => s.setVisibleSkills);

  useEffect(() => {
    api.skills().then(setSkills).catch(() => setSkills([]));
  }, []);

  const defaultVisible = useMemo(() => (skills ?? []).filter((s) => s.button).map((s) => s.name), [skills]);
  const effectiveVisible = visibleSkills ?? defaultVisible;

  if (skills === null) return <p className="text-sm text-neutral-500">Carregando skills...</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        Escolha quais skills aparecem como botao na tela Skills. O padrao e o que cada SKILL.md define
        (<code className="text-neutral-300">button: true</code>).
      </p>
      <ul className="space-y-2">
        {skills.map((skill) => {
          const checked = effectiveVisible.includes(skill.name);
          return (
            <li
              key={skill.name}
              className="flex items-center justify-between rounded-xl border border-edge bg-panel/60 px-4 py-3"
            >
              <div>
                <p className="text-sm text-neutral-200">{skill.title}</p>
                <p className="text-[10px] uppercase tracking-wide text-neutral-500">
                  {skill.engine} · saida: {skill.output}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={checked}
                onClick={() => toggleSkill(skill.name, defaultVisible)}
                className={`h-6 w-11 shrink-0 rounded-full border transition-colors ${
                  checked ? "border-cyan-glow bg-cyan-glow/30" : "border-edge bg-void"
                }`}
              >
                <span
                  className={`block h-4 w-4 translate-x-1 rounded-full bg-neutral-200 transition-transform ${
                    checked ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
      {visibleSkills !== null && (
        <button
          onClick={() => setVisibleSkills(defaultVisible)}
          className="text-xs text-neutral-500 underline hover:text-neutral-300"
        >
          Restaurar padrao
        </button>
      )}
    </div>
  );
}
