import React from "react";
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
    <section className="flex flex-col gap-3" aria-label="Alerts">
      {alerts.map((alert) => {
        const urgent = alert.severity === "CRITICAL";
        const color = urgent ? "var(--red)" : alert.severity === "LOW" ? "var(--blue)" : "var(--orange)";
        const soft = urgent ? "var(--red-soft)" : alert.severity === "LOW" ? "var(--blue-soft)" : "var(--orange-soft)";
        const Icon = ICONS[alert.icon] ?? Info;
        return (
          <div key={alert.id} className="card p-4 flex items-start gap-3.5" role="alert">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: soft }}>
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-snug">{alert.message}</p>
              <p className="text-[15px] mt-0.5" style={{ color }}>
                {alert.action}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
