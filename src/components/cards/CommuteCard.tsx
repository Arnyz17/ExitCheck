"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Car, Bus, Footprints, LucideIcon } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";
import Rise from "../Rise";

const MODES: { key: "driving" | "transit" | "walking"; label: string; icon: LucideIcon }[] = [
  { key: "driving", label: "Drive", icon: Car },
  { key: "transit", label: "Transit", icon: Bus },
  { key: "walking", label: "Walk", icon: Footprints },
];

const mins = (s: string) => {
  const m = s.match(/\d+/);
  return m && Number(m[0]) > 0 ? m[0] : "<1";
};

const mapsUrl = (origin: string, dest: string, mode: "driving" | "transit" | "walking") => {
  let pref = "google";
  try {
    pref = localStorage.getItem("exitcheck.maps") || "google";
  } catch {}
  if (pref === "apple") {
    const flag = { driving: "d", transit: "r", walking: "w" }[mode];
    return `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(dest)}&dirflg=${flag}`;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=${mode}`;
};

function LeaveBy({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const mins = Math.round((new Date(iso).getTime() - now) / 60000);
  const late = mins < 0;
  const color = late ? "var(--red)" : mins <= 10 ? "var(--orange)" : "var(--green)";
  const at = new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <div className="mt-6">
      <p className="eyebrow">Leave by {at}</p>
      <p className="text-[44px] sm:text-[56px] leading-none font-semibold tracking-[-0.04em] mt-2" style={{ color }}>
        {late ? `${Math.abs(mins)} min late` : mins === 0 ? "Now" : `in ${mins} min`}
      </p>
    </div>
  );
}

export default function CommuteCard({ commute }: { commute: ExitCheckResponse["sections"]["calendar_commute"] }) {
  if (!commute) return null;
  const destinations = (commute.destinations ?? []).filter((d) => d.raw_destination);
  const hasEvent = !!commute.next_event && !!commute.event_time && commute.event_time !== "N/A";
  if (destinations.length === 0 && !hasEvent) return null;

  return (
    <Rise>
      <section className="tile p-7">
        <p className="eyebrow">Getting there</p>

        {hasEvent && (
          <div className="flex items-center gap-4 mt-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--blue-soft)" }}>
              <Calendar className="w-6 h-6" style={{ color: "var(--blue)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                Up next · {commute.event_time}
              </p>
              <p className="text-[19px] font-semibold truncate">{commute.next_event}</p>
            </div>
          </div>
        )}

        {commute.leave_by && <LeaveBy iso={commute.leave_by} />}

        {commute.recommendation && (
          <p className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight mt-6">{commute.recommendation}</p>
        )}

        <div className="mt-6 flex flex-col gap-6">
          {destinations.map((dest, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-3 gap-3">
                <h3 className="text-[17px] font-semibold">{dest.label}</h3>
                <span className="text-[13px] truncate" style={{ color: "var(--text-2)" }}>
                  {dest.address}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {MODES.map(({ key, label, icon: Icon }) => (
                  <motion.a
                    key={key}
                    href={mapsUrl(dest.raw_origin || "", dest.raw_destination, key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className="rounded-2xl py-4 flex flex-col items-center gap-1"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <Icon className="w-5 h-5 mb-1" style={{ color: "var(--blue)" }} />
                    <span className="text-[22px] font-semibold leading-none tracking-tight">{mins(dest.travel_options[key])}</span>
                    <span className="text-[12px]" style={{ color: "var(--text-2)" }}>
                      min · {label}
                    </span>
                  </motion.a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Rise>
  );
}
