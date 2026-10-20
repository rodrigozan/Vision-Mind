"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalacao do PWA e best-effort; nao bloqueia o uso do HUD
      });
    }
  }, []);

  return null;
}
