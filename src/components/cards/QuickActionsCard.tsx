import React, { useState } from "react";
import { Car, DoorOpen, Power, CheckCircle2, Loader2, LucideIcon } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  endpoint: string;
}

interface QuickActionsCardProps {
  actions: QuickAction[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  "car": Car,
  "door-open": DoorOpen,
  "power": Power,
};

export default function QuickActionsCard({ actions }: QuickActionsCardProps) {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});

  if (!actions || actions.length === 0) return null;

  const handleAction = async (action: QuickAction) => {
    // Vibrate for physical feedback if on Android
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    setLoadingMap(prev => ({ ...prev, [action.id]: true }));

    try {
      const res = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id })
      });
      
      if (res.ok) {
        setSuccessMap(prev => ({ ...prev, [action.id]: true }));
        // Reset success after 3 seconds
        setTimeout(() => {
          setSuccessMap(prev => ({ ...prev, [action.id]: false }));
        }, 3000);
      }
    } catch (e) {
      console.error("Action failed:", e);
    } finally {
      setLoadingMap(prev => ({ ...prev, [action.id]: false }));
    }
  };

  return (
    <section className="bg-slate-800/80 rounded-2xl p-4 border border-blue-500/30">
      <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = ICON_MAP[action.icon] || Power;
          const isLoading = loadingMap[action.id];
          const isSuccess = successMap[action.id];

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={isLoading || isSuccess}
              className={`relative overflow-hidden flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                isSuccess 
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                  : "bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200 active:scale-95"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-2" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-6 h-6 mb-2" />
              ) : (
                <Icon className="w-6 h-6 mb-2 text-blue-400" />
              )}
              <span className="text-xs font-semibold text-center leading-tight">
                {isSuccess ? "Sent!" : action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
