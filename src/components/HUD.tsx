"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Nfc } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";
import Rise from "./Rise";
import Welcome from "./Welcome";
import { dayMessage } from "@/lib/greeting";
import TurnBack from "./TurnBack";
import dynamic from "next/dynamic";

import ComingUp from "./ComingUp";
const MapCard = dynamic(() => import("./MapCard"), { ssr: false });
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
  userId?: string;
}

function Ring({ score, label }: { score: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 90 ? "var(--green)" : score >= 60 ? "var(--orange)" : "var(--red)";
  return (
    <div className="relative w-[148px] h-[148px] mx-auto" role="img" aria-label={`Readiness ${score} out of 100: ${label}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" stroke="var(--surface)" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ type: "spring", stiffness: 40, damping: 14, delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-[40px] font-semibold tracking-[-0.04em] leading-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {score}
        </motion.span>
        <span className="text-[11px] mt-1 font-medium" style={{ color: "var(--text-2)" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HUD({ data, loading, refreshing, onRefresh, userId = "usr_123" }: HUDProps) {
  const alertCount = data?.sections.critical_alerts?.length ?? 0;
  const firstAlert = data?.sections.critical_alerts?.[0];
  const stamp = data?.timestamp;

  // A local ping when a check turns up problems and the user opted in.
  useEffect(() => {
    if (!stamp || !firstAlert) return;
    try {
      if (localStorage.getItem("exitcheck.notify") !== "1" || Notification.permission !== "granted") return;
      new Notification(`${alertCount} thing${alertCount > 1 ? "s" : ""} to sort before you go`, { body: `${firstAlert.message}. ${firstAlert.action}.` });
    } catch {}
  }, [stamp, alertCount, firstAlert]);

  if (loading || !data) return <SkeletonHUD />;

  const when = new Date(data.timestamp);
  const alerts = data.sections.critical_alerts ?? [];
  const first = data.user_name?.split(" ")[0];

  return (
    <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 pb-20">
      <section className="text-center pt-12 sm:pt-20 pb-10 sm:pb-14">
        <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          It&apos;s {when.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </motion.p>

        <motion.h1
          className="display gradient-text mt-4"
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.05 }}
        >
          {greeting(when)}
          {first ? `, ${first}` : ""}.
        </motion.h1>

        <motion.p
          className="text-[19px] sm:text-[24px] mt-4 font-medium max-w-[620px] mx-auto"
          style={{ color: "var(--text-2)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 100, damping: 18 }}
        >
          {dayMessage(new Date(), data.day_summary)}
        </motion.p>

        {data.tag && (
          <motion.p
            className="inline-flex items-center gap-1.5 mt-4 px-3.5 h-8 rounded-full text-[13px] font-medium"
            style={{ background: "var(--surface)", color: "var(--text-2)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <Nfc className="w-3.5 h-3.5" style={{ color: "var(--blue)" }} />
            {data.tag.name}
            {data.tag.location ? ` · ${data.tag.location}` : ""}
          </motion.p>
        )}

        {data.readiness && (
          <motion.div className="mt-8" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.15 }}>
            <Ring score={data.readiness.score} label={data.readiness.label} />
          </motion.div>
        )}

        <motion.p
          className="text-[19px] sm:text-[24px] mt-5 font-medium"
          style={{ color: alerts.length ? "var(--orange)" : "var(--green)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100, damping: 18 }}
        >
          {alerts.length === 0
            ? "You're all set to head out."
            : alerts.length === 1
            ? "One thing needs your attention."
            : `${alerts.length} things need your attention.`}
        </motion.p>

        <motion.div
          className="mt-7 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <motion.button
            onClick={onRefresh}
            whileTap={{ scale: 0.95 }}
            className="pill pill-quiet"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Updating" : "Refresh"}
          </motion.button>
        </motion.div>
      </section>

      <main className="flex flex-col gap-4 sm:gap-5">
        {data.tag_count === 0 && <Welcome userId={userId} />}
        {alerts.length > 0 && <CriticalAlertsCard alerts={alerts} />}
        <QuickActionsCard actions={data.sections.quick_actions ?? []} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <WeatherCard weather={data.sections.weather_directive} />
          <HomeSecurityCard security={data.sections.smart_home_check} />
          <div className="md:col-span-2 empty:hidden">
            <CommuteCard commute={data.sections.calendar_commute} />
          </div>
          <div className="md:col-span-2">
            <ComingUp userId={userId} />
          </div>
          <div className="md:col-span-2">
            <MapCard userId={userId} />
          </div>
          <div className="md:col-span-2">
            <TurnBack userId={userId} />
          </div>
          <GearChecklistCard gear={data.sections.required_gear_checklist} />
          <ShoppingCard shopping={data.sections.errands_and_shopping} />
        </div>
      </main>

      <Rise>
        <p className="text-center text-[13px] mt-12" style={{ color: "var(--text-3)" }}>
          Updated {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      </Rise>
    </div>
  );
}

function SkeletonHUD() {
  return (
    <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 pt-16" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="shimmer h-3 w-32 rounded-full" />
        <div className="shimmer h-14 w-[min(80%,420px)] rounded-2xl" />
        <div className="shimmer h-5 w-56 rounded-full" />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {[180, 180, 220, 200].map((h, i) => (
          <div key={i} className="shimmer rounded-[28px]" style={{ height: h }} />
        ))}
      </div>
    </div>
  );
}
