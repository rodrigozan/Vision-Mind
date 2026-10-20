import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrbState = "idle" | "listening" | "working" | "speaking" | "error";

export interface OrbEvent {
  state: OrbState;
  ts: string;
  [key: string]: unknown;
}

interface AppStore {
  orbState: OrbState;
  lastEvent: OrbEvent | null;
  lastTranscript: string;
  lastMessage: string;
  setOrbState: (state: OrbState) => void;
  setLastEvent: (event: OrbEvent) => void;
  setLastTranscript: (text: string) => void;
  setLastMessage: (text: string) => void;

  /** Skills escolhidas para aparecer como botao no painel (Fase 7, tela "Customize dashboard"). */
  visibleSkills: string[] | null;
  setVisibleSkills: (names: string[]) => void;
  toggleSkill: (name: string, allNames: string[]) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      orbState: "idle",
      lastEvent: null,
      lastTranscript: "",
      lastMessage: "",
      setOrbState: (state) => set({ orbState: state }),
      setLastEvent: (event) => set({ lastEvent: event, orbState: event.state }),
      setLastTranscript: (text) => set({ lastTranscript: text }),
      setLastMessage: (text) => set({ lastMessage: text }),

      visibleSkills: null,
      setVisibleSkills: (names) => set({ visibleSkills: names }),
      toggleSkill: (name, allNames) => {
        const current = get().visibleSkills ?? allNames;
        const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
        set({ visibleSkills: next });
      },
    }),
    {
      name: "vision-mind-hud",
      partialize: (state) => ({ visibleSkills: state.visibleSkills }),
    },
  ),
);
