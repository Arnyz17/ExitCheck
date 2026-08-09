"use client";

import React, { useState } from "react";
import { ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";

interface Props {
  shopping: ExitCheckResponse["sections"]["errands_and_shopping"];
}

export default function ShoppingCard({ shopping }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!shopping.items || shopping.items.length === 0) return null;

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-transparent active:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/20 p-2 rounded-xl">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
              On The Way
            </h2>
            <p className="text-sm font-medium text-slate-200">
              {shopping.active_store_nearby}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full">
            {shopping.items.length} items
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <ul className="space-y-2">
            {shopping.items.map((item, idx) => (
              <li
                key={idx}
                className="text-sm text-slate-300 bg-slate-900/40 px-3 py-2 rounded-lg flex items-center before:content-['•'] before:mr-2 before:text-purple-500"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
