"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Flame, BatteryWarning, Info, LucideIcon } from "lucide-react";

interface Alert {
  id: string;
  icon: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  action: string;
}

const ICONS: Record<string, LucideIcon> = {
  flame: Flame,
  "battery-charging": BatteryWarning,
  "alert-triangle": AlertTriangle,
};

export default function CriticalAlertsCard({ alerts }: { alerts: Alert[] }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-5" aria-label="Alerts">
      {alerts.map((alert, i) => {
        const color = alert.severity === "CRITICAL" ? "var(--red)" : alert.severity === "LOW" ? "var(--blue)" : "var(--orange)";
        const soft = alert.severity === "CRITICAL" ? "var(--red-soft)" : alert.severity === "LOW" ? "var(--blue-soft)" : "var(--orange-soft)";
        const Icon = ICONS[alert.icon] ?? Info;
        return (
          <motion.div
            key={alert.id}
            role="alert"
            className="tile p-5 sm:p-6 flex items-center gap-4"
            initial={{ opacity: 0, x: -24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.3 + i * 0.08 }}
          >
            <motion.div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: soft }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className="w-6 h-6" style={{ color }} />
            </motion.div>
            <div className="min-w-0">
              <p className="text-[18px] font-semibold leading-snug">{alert.message}</p>
              <p className="text-[15px] mt-0.5" style={{ color }}>
                {alert.action}
              </p>
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}
