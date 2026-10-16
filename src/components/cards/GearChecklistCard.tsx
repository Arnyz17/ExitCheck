"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Backpack } from "lucide-react";
import Rise from "../Rise";

const STORAGE_KEY = "exitcheck.gear.checked";

export default function GearChecklistCard({ gear }: { gear: string[] }) {
  // Ticks persist across refreshes and reset when the day changes.
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.day === new Date().toDateString()) return new Set<string>(saved.items);
    } catch {}
    return new Set<string>();
  });

  if (!gear || gear.length === 0) return null;

  const toggle = (item: string) => {
    try {
      navigator.vibrate?.(15);
    } catch {}
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ day: new Date().toDateString(), items: [...next] }));
      } catch {}
      return next;
    });
  };

  const done = gear.filter((g) => checked.has(g)).length;
  const allDone = done === gear.length;

  return (
    <Rise>
      <section className="tile p-7 h-full">
        <div className="flex items-start justify-between">
          <p className="eyebrow">Don&apos;t forget</p>
          <Backpack className="w-9 h-9" strokeWidth={1.5} style={{ color: allDone ? "var(--green)" : "var(--blue)" }} />
        </div>
        <p className="text-[24px] font-semibold tracking-tight mt-4">{allDone ? "All packed" : `${done} of ${gear.length} packed`}</p>

        <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: "var(--surface-2)" }}>
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${(done / gear.length) * 100}%`, background: allDone ? "var(--green)" : "var(--blue)" }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          />
        </div>

        <ul className="mt-3">
          {gear.map((item) => {
            const on = checked.has(item);
            return (
              <li key={item} className="hairline">
                <button onClick={() => toggle(item)} role="checkbox" aria-checked={on} className="w-full flex items-center gap-3.5 py-3.5 text-left">
                  <motion.span
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    animate={{
                      background: on ? "var(--green)" : "rgba(0,0,0,0)",
                      borderColor: on ? "var(--green)" : "var(--text-3)",
                      scale: on ? [1, 1.25, 1] : 1,
                    }}
                    transition={{ duration: 0.35 }}
                    style={{ border: "1.5px solid" }}
                  >
                    <AnimatePresence>
                      {on && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 22 }}>
                          <Check className="w-4 h-4 text-white" strokeWidth={3.5} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>
                  <motion.span animate={{ opacity: on ? 0.4 : 1 }} className="text-[17px]" style={{ textDecoration: on ? "line-through" : "none" }}>
                    {item}
                  </motion.span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </Rise>
  );
}
