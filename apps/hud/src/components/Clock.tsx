"use client";

import { useEffect, useState } from "react";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center font-mono text-3xl tabular-nums text-neutral-200">
      {now ? now.toLocaleTimeString("pt-BR") : "--:--:--"}
    </div>
  );
}
