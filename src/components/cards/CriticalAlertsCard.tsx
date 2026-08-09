import React from "react";
import { AlertTriangle, Flame, BatteryWarning, Info } from "lucide-react";

interface Alert {
  id: string;
  icon: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  action: string;
}

interface Props {
  alerts: Alert[];
}

export default function CriticalAlertsCard({ alerts }: Props) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "flame":
        return <Flame className="w-6 h-6 text-red-500 flex-shrink-0" />;
      case "battery-charging":
        return <BatteryWarning className="w-6 h-6 text-red-500 flex-shrink-0" />;
      case "alert-triangle":
        return <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />;
      default:
        return <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-4 p-4 rounded-2xl border ${
            alert.severity === "CRITICAL"
              ? "bg-red-950/40 border-red-900/50"
              : "bg-amber-950/40 border-amber-900/50"
          }`}
        >
          <div className="mt-1">{getIcon(alert.icon)}</div>
          <div className="flex flex-col">
            <h3
              className={`text-lg font-semibold leading-tight ${
                alert.severity === "CRITICAL" ? "text-red-400" : "text-amber-400"
              }`}
            >
              {alert.severity} ALERT
            </h3>
            <p className="text-slate-200 mt-1">{alert.message}</p>
            <div
              className={`mt-3 inline-block px-3 py-1.5 rounded-lg text-sm font-bold tracking-wide ${
                alert.severity === "CRITICAL"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              ACT: {alert.action}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
