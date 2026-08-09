import React from "react";
import Link from "next/link";
import { ExitCheckResponse } from "@/lib/schema";
import CriticalAlertsCard from "./cards/CriticalAlertsCard";
import CommuteCard from "./cards/CommuteCard";
import HomeSecurityCard from "./cards/HomeSecurityCard";
import ShoppingCard from "./cards/ShoppingCard";
import GearChecklistCard from "./cards/GearChecklistCard";
import QuickActionsCard from "./cards/QuickActionsCard";
import { Loader2, Settings } from "lucide-react";

interface HUDProps {
  data: ExitCheckResponse | null;
  loading: boolean;
}

export default function HUD({ data, loading }: HUDProps) {
  if (loading || !data) {
    return <SkeletonHUD />;
  }

  // Determine top-level border or background styling based on theme
  const themeStyles =
    data.display_theme === "alert_warning"
      ? "border-t-4 border-amber-500"
      : data.display_theme === "critical"
      ? "border-t-4 border-red-500"
      : data.display_theme === "success"
      ? "border-t-4 border-emerald-500"
      : "border-t-4 border-blue-500";

  return (
    <div
      className={`min-h-screen bg-slate-900 text-slate-50 w-full max-w-[430px] mx-auto pb-24 ${themeStyles} font-sans`}
    >
      <header className="px-5 pt-6 pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">ExitCheck</h1>
            <Link 
              href="/settings" 
              className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors flex items-center justify-center shadow-lg border border-slate-700"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
            </Link>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {new Date(data.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div
          className={`h-3 w-3 rounded-full ${
            data.display_theme === "alert_warning"
              ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              : data.display_theme === "critical"
              ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          }`}
        ></div>
      </header>

      <main className="px-4 space-y-4 flex flex-col">
        {data.sections.critical_alerts && data.sections.critical_alerts.length > 0 && (
          <CriticalAlertsCard alerts={data.sections.critical_alerts} />
        )}
        
        {data.sections.quick_actions && data.sections.quick_actions.length > 0 && (
          <QuickActionsCard actions={data.sections.quick_actions} />
        )}
        
        <CommuteCard commute={data.sections.calendar_commute} />
        
        <HomeSecurityCard security={data.sections.smart_home_check} />
        
        <ShoppingCard shopping={data.sections.errands_and_shopping} />
        
        <GearChecklistCard gear={data.sections.required_gear_checklist} />
      </main>

      {/* Sticky bottom navigation bar — always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-[430px] mx-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/80 px-4 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            <Link
              href="/settings"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white font-semibold text-sm shadow-lg hover:from-blue-500 hover:to-blue-400 active:scale-95 transition-all"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <p className="text-xs text-slate-500">Addresses • Gear • Integrations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonHUD() {
  return (
    <div className="min-h-screen bg-slate-900 w-full max-w-[430px] mx-auto p-4 animate-pulse">
      <div className="h-10 w-40 bg-slate-800 rounded-md mt-4 mb-2"></div>
      <div className="h-4 w-24 bg-slate-800 rounded-md mb-8"></div>

      <div className="space-y-4">
        <div className="h-32 w-full bg-slate-800/80 rounded-2xl"></div>
        <div className="h-40 w-full bg-slate-800/80 rounded-2xl"></div>
        <div className="h-28 w-full bg-slate-800/80 rounded-2xl"></div>
        <div className="h-48 w-full bg-slate-800/80 rounded-2xl"></div>
      </div>
      
      <div className="flex justify-center items-center h-20 mt-4 text-slate-500">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    </div>
  );
}
