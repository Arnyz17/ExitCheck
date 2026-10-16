"use client";

import { SessionProvider } from "next-auth/react";
import AppShell from "./AppShell";

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
