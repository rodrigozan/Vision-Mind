"use client";

import { motion } from "framer-motion";
import type { OrbState } from "@/lib/store";

const PALETTE: Record<OrbState, { glow: string; ring: string; label: string }> = {
  idle: { glow: "#38e1ff", ring: "rgba(56,225,255,0.35)", label: "ocioso" },
  listening: { glow: "#ffb454", ring: "rgba(255,180,84,0.45)", label: "escutando" },
  working: { glow: "#38e1ff", ring: "rgba(56,225,255,0.55)", label: "trabalhando" },
  speaking: { glow: "#4ade80", ring: "rgba(74,222,128,0.5)", label: "falando" },
  error: { glow: "#ff5c5c", ring: "rgba(255,92,92,0.55)", label: "erro" },
};

const PULSE_DURATION: Record<OrbState, number> = {
  idle: 3.2,
  listening: 0.9,
  working: 0.6,
  speaking: 0.8,
  error: 0.4,
};

export function Orb({ state }: { state: OrbState }) {
  const { glow, ring, label } = PALETTE[state];
  const duration = PULSE_DURATION[state];

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative h-48 w-48">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: ring }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-6 rounded-full"
          style={{ background: `radial-gradient(circle at 35% 30%, ${glow}, transparent 70%)`, boxShadow: `0 0 70px 12px ${ring}` }}
          animate={
            state === "working"
              ? { rotate: 360 }
              : { scale: [1, 1.06, 1] }
          }
          transition={
            state === "working"
              ? { duration: 1.4, repeat: Infinity, ease: "linear" }
              : { duration, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-void" style={{ boxShadow: `0 0 18px 6px ${glow}` }} />
        </div>
      </div>
      <span className="text-xs uppercase tracking-[0.3em] text-neutral-400">{label}</span>
    </div>
  );
}
