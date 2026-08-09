import React from "react";
import { ShieldCheck, ShieldAlert, Lock, Zap, CheckCircle2 } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";

interface Props {
  security: ExitCheckResponse["sections"]["smart_home_check"];
}

export default function HomeSecurityCard({ security }: Props) {
  const isSecure = security.appliances_cleared && security.doors_and_locks.includes("LOCKED");

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
          {isSecure ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          )}
          Home Security
        </h2>
        {isSecure && (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
            SECURE
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">Doors & Locks</p>
            <p className="text-xs text-slate-400 mt-0.5">{security.doors_and_locks}</p>
          </div>
          {security.doors_and_locks.includes("LOCKED") && (
            <CheckCircle2 className="w-5 h-5 text-emerald-500/70 flex-shrink-0" />
          )}
        </div>

        <div className="h-px bg-slate-700/50 w-full" />

        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">Windows & Appliances</p>
            <p className="text-xs text-slate-400 mt-0.5">{security.windows}</p>
          </div>
          {security.appliances_cleared && (
            <CheckCircle2 className="w-5 h-5 text-emerald-500/70 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
