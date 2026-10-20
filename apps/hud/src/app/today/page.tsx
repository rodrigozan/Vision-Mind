"use client";

import { useEffect, useState } from "react";
import { api, type VaultFile } from "@/lib/api";

function splitSections(markdown: string): Array<{ heading: string; body: string }> {
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---\n/, "");
  const parts = withoutFrontmatter.split(/\n(?=## )/).map((part) => part.trim()).filter(Boolean);

  return parts.map((part) => {
    const [firstLine, ...rest] = part.split("\n");
    const heading = firstLine.replace(/^##\s*/, "");
    return { heading, body: rest.join("\n").trim() };
  });
}

export default function TodayPage() {
  const [note, setNote] = useState<VaultFile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.today().then(setNote).catch(() => setError(true));
  }, []);

  if (error) return <p className="text-sm text-red-glow">Nao foi possivel carregar o foco da semana.</p>;
  if (note === null) return <p className="text-sm text-neutral-500">Carregando...</p>;

  const sections = splitSections(note.content);

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{note.path}</p>
      {sections.length === 0 ? (
        <pre className="whitespace-pre-wrap text-sm text-neutral-200">{note.content}</pre>
      ) : (
        sections.map((section) => (
          <div key={section.heading} className="rounded-xl border border-edge bg-panel/60 p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cyan-glow">{section.heading}</h2>
            <p className="whitespace-pre-wrap text-sm text-neutral-200">{section.body || "—"}</p>
          </div>
        ))
      )}
    </div>
  );
}
