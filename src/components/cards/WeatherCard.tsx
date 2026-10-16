"use client";

import React from "react";
import { Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudFog, LucideIcon } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";
import Rise from "../Rise";

const ICONS: Record<string, LucideIcon> = { thunder: CloudLightning, snow: CloudSnow, rain: CloudRain, fog: CloudFog, partly: CloudSun, cloud: Cloud, clear: Sun };

const kind = (c: string) => {
  const s = c.toLowerCase();
  return ["thunder", "snow", "rain", "fog", "partly", "cloud"].find((k) => s.includes(k)) ?? "clear";
};

export default function WeatherCard({ weather }: { weather: ExitCheckResponse["sections"]["weather_directive"] }) {
  if (!weather || !weather.condition) return null;
  const Icon = ICONS[kind(weather.condition)];

  return (
    <Rise>
      <section className="tile p-7 h-full flex flex-col justify-between min-h-[200px]">
        <div className="flex items-start justify-between">
          <p className="eyebrow">Weather</p>
          <Icon className="w-9 h-9" style={{ color: "var(--blue)" }} strokeWidth={1.5} />
        </div>
        <div className="mt-6">
          {weather.current_temp !== undefined && (
            <p className="text-[64px] leading-none font-semibold tracking-[-0.04em]">{weather.current_temp}°</p>
          )}
          <p className="text-[19px] font-semibold mt-2">{weather.condition}</p>
          <p className="text-[15px] mt-1" style={{ color: "var(--text-2)" }}>
            {weather.temp_range}
            {weather.action ? ` · ${weather.action}` : ""}
          </p>
        </div>
      </section>
    </Rise>
  );
}
