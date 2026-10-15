import React from "react";
import Link from "next/link";
import { RefreshCw, Settings } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";
import CriticalAlertsCard from "./cards/CriticalAlertsCard";
import CommuteCard from "./cards/CommuteCard";
import HomeSecurityCard from "./cards/HomeSecurityCard";
import ShoppingCard from "./cards/ShoppingCard";
import GearChecklistCard from "./cards/GearChecklistCard";
import QuickActionsCard from "./cards/QuickActionsCard";
import WeatherCard from "./cards/WeatherCard";

interface HUDProps {
  data: ExitCheckResponse | null;
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HUD({ data, loading, refreshing, onRefresh }: HUDProps) {
  if (loading || !data) return <SkeletonHUD />;

  const when = new Date(data.timestamp);
  const hasAlerts = data.sections.critical_alerts?.length > 0;

  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pb-12" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
      <header className="flex items-start justify-between pt-4 pb-5">
        <div>
          <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
            {when.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-[34px] leading-[1.1] font-bold tracking-tight mt-1">{greeting(when)}</h1>
          <p className="text-[15px] mt-1" style={{ color: hasAlerts ? "var(--orange)" : "var(--green)" }}>
            {hasAlerts
              ? data.sections.critical_alerts.length === 1
                ? "1 thing needs your attention"
                : `${data.sections.critical_alerts.length} things need your attention`
              : "You're all set to head out"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            aria-label="Refresh"
            className="pressable w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}
          >
            <RefreshCw className={`w-[18px] h-[18px] ${refreshing ? "animate-spin" : ""}`} style={{ color: "var(--blue)" }} />
          </button>
          <Link
            href="/settings"
            aria-label="Settings"
            className="pressable w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}
          >
            <Settings className="w-[18px] h-[18px]" style={{ color: "var(--blue)" }} />
          </Link>
        </div>
      </header>

      <main className="flex flex-col gap-4">
        {hasAlerts && <CriticalAlertsCard alerts={data.sections.critical_alerts} />}
        <QuickActionsCard actions={data.sections.quick_actions ?? []} />
        <CommuteCard commute={data.sections.calendar_commute} />
        <WeatherCard weather={data.sections.weather_directive} />
        <HomeSecurityCard security={data.sections.smart_home_check} />
        <ShoppingCard shopping={data.sections.errands_and_shopping} />
        <GearChecklistCard gear={data.sections.required_gear_checklist} />
      </main>

      <p className="text-center text-xs mt-8" style={{ color: "var(--text-3)" }}>
        Updated {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </p>
    </div>
  );
}

function SkeletonHUD() {
  return (
    <div className="w-full max-w-[560px] mx-auto px-4 pt-10 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-40 rounded-md" style={{ background: "var(--surface-2)" }} />
      <div className="h-9 w-60 rounded-md mt-3 mb-8" style={{ background: "var(--surface-2)" }} />
      <div className="flex flex-col gap-4">
        {[112, 176, 136, 168].map((h, i) => (
          <div key={i} className="card" style={{ height: h }} />
        ))}
      </div>
    </div>
  );
}
