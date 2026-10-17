"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import { ToastProvider } from "./Toast";

const LINKS = [
  { href: "/exit", label: "Today" },
  { href: "/tags", label: "Stickers" },
  { href: "/services", label: "Services" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "You" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const accent = localStorage.getItem("exitcheck.accent");
      if (accent) document.documentElement.style.setProperty("--blue", accent);
    } catch {}
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <header
          className="sticky top-0 z-50"
          style={{
            background: "var(--nav)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
            borderBottom: "1px solid var(--line)",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <nav className="max-w-[1240px] mx-auto h-12 px-4 lg:px-10 flex items-center justify-between">
            <Link href="/exit" className="text-[15px] font-semibold tracking-tight">
              ExitCheck
            </Link>
            <ul className="flex items-center gap-0 sm:gap-3">
              {LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <li key={l.href} className="relative">
                    <Link
                      href={l.href}
                      className="block px-2 sm:px-3 py-1.5 text-[12.5px] sm:text-[14px] rounded-full transition-colors"
                      style={{ color: active ? "var(--text)" : "var(--text-2)", fontWeight: active ? 600 : 400 }}
                    >
                      {l.label}
                    </Link>
                    {active && (
                      <motion.span
                        layoutId="nav-dot"
                        className="absolute left-1/2 -bottom-[7px] w-1 h-1 rounded-full -translate-x-1/2"
                        style={{ background: "var(--blue)" }}
                        transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>
        {children}
      </ToastProvider>
    </MotionConfig>
  );
}
