"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { iconFor } from "@/lib/icons";
import { useToast } from "../Toast";
import Rise from "../Rise";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  endpoint: string;
  kind?: "webhook" | "shortcut" | "link";
  href?: string;
}

type State = "idle" | "loading" | "done" | "error";

export default function QuickActionsCard({ actions }: { actions: QuickAction[] }) {
  const [state, setState] = useState<Record<string, State>>({});
  const toast = useToast();

  if (!actions || actions.length === 0) return null;

  const set = (id: string, s: State) => setState((p) => ({ ...p, [id]: s }));

  const run = async (a: QuickAction) => {
    try {
      navigator.vibrate?.(15);
    } catch {}

    if (a.kind === "shortcut" || a.kind === "link") {
      if (a.href) window.open(a.href, a.kind === "link" ? "_blank" : "_self");
      set(a.id, "done");
      setTimeout(() => set(a.id, "idle"), 1800);
      return;
    }

    set(a.id, "loading");
    try {
      const res = await fetch(a.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: a.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Request failed");
      set(a.id, "done");
      toast(body.message || `${a.label} done`);
    } catch (e) {
      set(a.id, "error");
      toast(e instanceof Error ? e.message : "Something went wrong");
    }
    setTimeout(() => set(a.id, "idle"), 2200);
  };

  return (
    <Rise>
      <section aria-label="Quick actions" className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {actions.map((a) => {
          const s = state[a.id] ?? "idle";
          const Icon = iconFor(a.icon);
          const tint = s === "done" ? "var(--green)" : s === "error" ? "var(--red)" : "var(--blue)";
          const soft = s === "done" ? "var(--green-soft)" : s === "error" ? "var(--red-soft)" : "var(--blue-soft)";
          return (
            <motion.button
              key={a.id}
              onClick={() => run(a)}
              disabled={s === "loading"}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="tile snap-start shrink-0 flex-1 sm:flex-none sm:min-w-[210px] min-w-[148px] p-4 pr-6 flex items-center gap-3 text-left"
            >
              <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: soft }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={s}
                    initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  >
                    {s === "loading" ? (
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: tint }} />
                    ) : s === "done" ? (
                      <Check className="w-5 h-5" style={{ color: tint }} strokeWidth={3} />
                    ) : s === "error" ? (
                      <AlertCircle className="w-5 h-5" style={{ color: tint }} />
                    ) : (
                      <Icon className="w-5 h-5" style={{ color: tint }} />
                    )}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="text-[15px] font-semibold leading-tight">{a.label}</span>
            </motion.button>
          );
        })}
      </section>
    </Rise>
  );
}
