"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

function Icon({ path, ...props }: { path: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={path} />
    </svg>
  );
}

const ITEMS = [
  { href: "/", label: "HUD", path: "M12 3v4m0 10v4M3 12h4m10 0h4M7.76 7.76l-1.42-1.42m11.32 11.32l-1.42-1.42M16.24 7.76l1.42-1.42M6.34 17.66l1.42-1.42" },
  { href: "/skills", label: "Skills", path: "M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v7H4v-7zm9 0h7v7h-7v-7z" },
  { href: "/engines", label: "Motores", path: "M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 7h10v10H7V7z" },
  { href: "/today", label: "Hoje", path: "M4 5h16v16H4V5zm0 5h16M8 3v4M16 3v4" },
  { href: "/jobs", label: "Jobs", path: "M4 6h16M4 12h16M4 18h10" },
  { href: "/settings", label: "Config", path: "M12 9a3 3 0 100 6 3 3 0 000-6zM4.6 10.5l-1.1-.6 1-1.7 1.2.4a7.9 7.9 0 011.6-.9l.1-1.3h2l.1 1.3c.6.2 1.1.5 1.6.9l1.2-.4 1 1.7-1.1.6c.1.5.1 1 0 1.5l1.1.6-1 1.7-1.2-.4c-.5.4-1 .7-1.6.9l-.1 1.3h-2l-.1-1.3a7.9 7.9 0 01-1.6-.9l-1.2.4-1-1.7 1.1-.6a5.4 5.4 0 010-1.5z" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-panel/90 backdrop-blur">
      <ul className="mx-auto flex max-w-md justify-between px-2 py-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] uppercase tracking-wide transition-colors ${
                  active ? "text-cyan-glow" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Icon path={item.path} className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
