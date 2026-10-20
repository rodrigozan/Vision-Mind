import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: "#05070a",
        panel: "#0b1016",
        edge: "#1b2430",
        cyan: {
          glow: "#38e1ff",
        },
        amber: {
          glow: "#ffb454",
        },
        green: {
          glow: "#4ade80",
        },
        red: {
          glow: "#ff5c5c",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        orb: "0 0 60px 10px var(--orb-glow)",
      },
    },
  },
  plugins: [],
};

export default config;
