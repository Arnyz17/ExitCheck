"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface Props {
  gear: string[];
}

const STORAGE_KEY = "exitcheck.gear.checked";

export default function GearChecklistCard({ gear }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Restore ticks so a refresh doesn't undo them (cleared when the day changes).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.day === new Date().toDateString()) setChecked(new Set(saved.items));
    } catch {}
  }, []);

  if (!gear || gear.length === 0) return null;

  const toggle = (item: string) => {
    try {
      navigator.vibrate?.(20);
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
    <section className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[17px] font-semibold">Don&apos;t forget</h2>
        <span className="text-[13px] font-medium" style={{ color: allDone ? "var(--green)" : "var(--text-2)" }}>
          {allDone ? "All packed" : `${done} of ${gear.length}`}
        </span>
      </div>
      <ul>
        {gear.map((item, i) => {
          const on = checked.has(item);
          return (
            <li key={item} style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}>
              <button
                onClick={() => toggle(item)}
                role="checkbox"
                aria-checked={on}
                className="w-full flex items-center gap-3.5 py-3 text-left"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    background: on ? "var(--green)" : "transparent",
                    border: on ? "none" : "1.5px solid var(--text-3)",
                  }}
                >
                  {on && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </span>
                <span
                  className="text-[16px]"
                  style={{ color: on ? "var(--text-3)" : "var(--text)", textDecoration: on ? "line-through" : "none" }}
                >
                  {item}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
