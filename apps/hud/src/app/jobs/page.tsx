"use client";

import { useEffect, useState } from "react";
import { api, type JobStatus } from "@/lib/api";

const STATE_COLOR: Record<string, string> = {
  completed: "text-green-glow",
  failed: "text-red-glow",
  active: "text-cyan-glow",
  waiting: "text-neutral-400",
  delayed: "text-amber-glow",
};

function formatDuration(job: JobStatus): string {
  if (job.processedOn && job.finishedOn) {
    return `${((job.finishedOn - job.processedOn) / 1000).toFixed(1)}s`;
  }
  if (job.processedOn) return "em andamento...";
  return "na fila";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobStatus[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () => api.jobs(30).then(setJobs).catch(() => setError(true));
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <p className="text-sm text-red-glow">Nao foi possivel carregar os jobs.</p>;
  if (jobs === null) return <p className="text-sm text-neutral-500">Carregando jobs...</p>;
  if (jobs.length === 0) return <p className="text-sm text-neutral-500">Nenhum job ainda.</p>;

  return (
    <ul className="space-y-2">
      {jobs.map((job) => (
        <li key={job.id} className="space-y-1 rounded-xl border border-edge bg-panel/60 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono text-neutral-200">
              {job.data.skill ?? job.data.route} <span className="text-neutral-500">· {job.data.engine}</span>
            </span>
            <span className={`text-xs uppercase tracking-wide ${STATE_COLOR[job.state] ?? "text-neutral-400"}`}>
              {job.state}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>{formatDuration(job)}</span>
            {job.returnvalue?.path && <span className="truncate text-neutral-400">{job.returnvalue.path}</span>}
          </div>
          {job.failedReason && <p className="text-xs text-red-glow">{job.failedReason}</p>}
        </li>
      ))}
    </ul>
  );
}
