import React from "react";
import { CloudSun } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";

interface Props {
  weather: ExitCheckResponse["sections"]["weather_directive"];
}

export default function WeatherCard({ weather }: Props) {
  if (!weather || (!weather.condition && !weather.action)) return null;

  return (
    <section className="card p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--blue-soft)" }}>
        <CloudSun className="w-6 h-6" style={{ color: "var(--blue)" }} />
      </div>
      <div className="min-w-0">
        <p className="text-[17px] font-semibold leading-snug">{weather.condition}</p>
        <p className="text-[14px] mt-0.5" style={{ color: "var(--text-2)" }}>
          {[weather.temp_range, weather.action].filter(Boolean).join(" · ")}
        </p>
      </div>
    </section>
  );
}
