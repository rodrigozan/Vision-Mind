import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vision Mind",
  description: "Cockpit do Vision Mind",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-void font-mono text-neutral-200 antialiased">
        <ServiceWorkerRegister />
        <main className="mx-auto min-h-screen max-w-md px-4 pb-24 pt-8">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
