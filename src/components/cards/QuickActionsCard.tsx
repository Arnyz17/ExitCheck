"use client";

import React, { useState } from "react";
import { Car, DoorOpen, Power, Check, Loader2, AlertCircle, LucideIcon } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  endpoint: string;
}

const ICONS: Record<string, LucideIcon> = {
  car: Car,
  "door-open": DoorOpen,
  power: Power,
};

type State = "idle" | "loading" | "done" | "error";

export default function QuickActionsCard({ actions }: { actions: QuickAction[] }) {
  const [state, setState] = useState<Record<string, State>>({});
  const [message, setMessage] = useState<string | null>(null);

  if (!actions || actions.length === 0) return null;

  const set = (id: string, s: State) => setState((prev) => ({ ...prev, [id]: s }));

  const run = async (action: QuickAction) => {
    try {
      navigator.vibrate?.(20);
    } catch {}
    set(action.id, "loading");
    try {
      const res = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Request failed");
      set(action.id, "done");
      setMessage(body.message || `${action.label} sent`);
    } catch {
      set(action.id, "error");
      setMessage(`Couldn't complete “${action.label}”. Try again.`);
    }
    setTimeout(() => set(action.id, "idle"), 2500);
  };

  return (
    <section>
      <div className={`grid gap-3 ${actions.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {actions.map((action) => {
          const s = state[action.id] ?? "idle";
          const Icon = ICONS[action.icon] ?? Power;
          const tint = s === "done" ? "var(--green)" : s === "error" ? "var(--red)" : "var(--blue)";
          const soft = s === "done" ? "var(--green-soft)" : s === "error" ? "var(--red-soft)" : "var(--blue-soft)";
          return (
            <button
              key={action.id}
              onClick={() => run(action)}
              disabled={s === "loading"}
              className="pressable card p-4 flex flex-col items-start gap-3 text-left"
            >
              <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: soft }}>
                {s === "loading" ? (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: tint }} />
                ) : s === "done" ? (
                  <Check className="w-5 h-5" style={{ color: tint }} strokeWidth={3} />
                ) : s === "error" ? (
                  <AlertCircle className="w-5 h-5" style={{ color: tint }} />
                ) : (
                  <Icon className="w-5 h-5" style={{ color: tint }} />
                )}
              </span>
              <span className="text-[15px] font-semibold leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="text-[13px] mt-2 px-1 min-h-[18px]" style={{ color: "var(--text-2)" }}>
        {message}
      </p>
    </section>
  );
}
