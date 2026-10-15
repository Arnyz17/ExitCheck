import React from "react";
import { Calendar, Car, Bus, Footprints, LucideIcon } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";

interface Props {
  commute: ExitCheckResponse["sections"]["calendar_commute"];
}

const MODES: { key: "driving" | "transit" | "walking"; label: string; icon: LucideIcon }[] = [
  { key: "driving", label: "Drive", icon: Car },
  { key: "transit", label: "Transit", icon: Bus },
  { key: "walking", label: "Walk", icon: Footprints },
];

const minutes = (s: string) => {
  const m = s.match(/\d+/);
  return m && Number(m[0]) > 0 ? `${m[0]} min` : "<1 min";
};

export default function CommuteCard({ commute }: Props) {
  if (!commute) return null;
  const destinations = (commute.destinations ?? []).filter((d) => d.raw_destination);
  const hasEvent = commute.next_event && commute.event_time && commute.event_time !== "N/A";
  if (destinations.length === 0 && !hasEvent) return null;

  return (
    <section className="card p-4 flex flex-col gap-4">
      {hasEvent && (
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--blue-soft)" }}>
            <Calendar className="w-5 h-5" style={{ color: "var(--blue)" }} />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Up next · {commute.event_time}</p>
            <p className="text-[17px] font-semibold leading-snug truncate">{commute.next_event}</p>
          </div>
        </div>
      )}

      {destinations.map((dest, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-[15px] font-semibold">{dest.label}</h3>
            <span className="text-[13px] truncate ml-3" style={{ color: "var(--text-2)" }}>
              {dest.address}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(({ key, label, icon: Icon }) => (
              <a
                key={key}
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(dest.raw_origin || "")}&destination=${encodeURIComponent(dest.raw_destination)}&travelmode=${key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable rounded-xl py-2.5 flex flex-col items-center gap-0.5"
                style={{ background: "var(--surface-2)" }}
              >
                <Icon className="w-[18px] h-[18px]" style={{ color: "var(--blue)" }} />
                <span className="text-[15px] font-semibold">{minutes(dest.travel_options[key])}</span>
                <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{label}</span>
              </a>
            ))}
          </div>
        </div>
      ))}

      {commute.recommendation && (
        <p className="text-[15px] rounded-xl px-3.5 py-3" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
          {commute.recommendation}
        </p>
      )}
    </section>
  );
}
