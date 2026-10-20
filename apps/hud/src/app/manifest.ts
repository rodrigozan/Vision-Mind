import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vision Mind",
    short_name: "Vision Mind",
    description: "Cockpit do Vision Mind — HUD de voz e skills",
    start_url: "/",
    display: "standalone",
    background_color: "#05070a",
    theme_color: "#05070a",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
