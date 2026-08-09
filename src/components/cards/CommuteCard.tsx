import React from "react";
import { Calendar, Car, Bus, Footprints } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";

interface Props {
  commute: ExitCheckResponse["sections"]["calendar_commute"];
}

export default function CommuteCard({ commute }: Props) {
  if (!commute || !commute.destinations || commute.destinations.length === 0) return null;

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-4">
      {commute.next_event && (
        <div className="flex items-start gap-3 border-b border-slate-700/50 pb-3 mb-1">
          <div className="bg-blue-500/20 p-2 rounded-xl mt-1">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Next Event • {commute.event_time}
            </h2>
            <p className="text-lg font-medium text-slate-100 leading-tight">
              {commute.next_event}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {commute.destinations.map((dest, index) => (
          <div key={index} className="bg-slate-900/50 rounded-xl p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">{dest.label} <span className="text-slate-500 text-xs font-normal">({dest.address})</span></h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <a 
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(dest.raw_origin || "")}&destination=${encodeURIComponent(dest.raw_destination || "")}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors cursor-pointer group"
              >
                <Car className="w-4 h-4 text-slate-400 group-hover:text-slate-200 mb-1 transition-colors" />
                <span className="text-xs font-semibold text-slate-200">
                  {dest.travel_options.driving.split(" ")[0]}m
                </span>
              </a>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(dest.raw_origin || "")}&destination=${encodeURIComponent(dest.raw_destination || "")}&travelmode=transit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer group"
              >
                <Bus className="w-4 h-4 text-blue-400 group-hover:text-blue-300 mb-1 transition-colors" />
                <span className="text-xs font-semibold text-blue-300">
                  {dest.travel_options.transit.split(" ")[0]}m
                </span>
              </a>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(dest.raw_origin || "")}&destination=${encodeURIComponent(dest.raw_destination || "")}&travelmode=walking`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-colors cursor-pointer group"
              >
                <Footprints className="w-4 h-4 text-slate-400 group-hover:text-slate-200 mb-1 transition-colors" />
                <span className="text-xs font-semibold text-slate-200">
                  {dest.travel_options.walking.split(" ")[0]}m
                </span>
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-3 flex gap-3 items-center">
        <span className="text-blue-400 font-bold text-sm">REC:</span>
        <span className="text-sm text-blue-100">{commute.recommendation}</span>
      </div>
    </div>
  );
}
