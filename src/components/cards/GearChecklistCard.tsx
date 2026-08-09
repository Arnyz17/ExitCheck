"use client";

import React, { useState } from "react";
import { Backpack, Check } from "lucide-react";

interface Props {
  gear: string[];
}

export default function GearChecklistCard({ gear }: Props) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  if (!gear || gear.length === 0) return null;

  const toggleItem = (idx: number) => {
    // Cross-platform safe haptics
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(50);
      } catch (err) {
        // Ignore haptics failure gracefully on platforms that don't support it
      }
    }

    setCheckedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  const allChecked = checkedItems.size === gear.length && gear.length > 0;

  return (
    <div
      className={`border rounded-2xl p-4 transition-colors duration-300 ${
        allChecked
          ? "bg-emerald-950/20 border-emerald-900/50"
          : "bg-slate-800/60 border-slate-700/50"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
          <Backpack className="w-4 h-4 text-slate-400" />
          Required Gear
        </h2>
        <span className="text-xs font-medium text-slate-400">
          {checkedItems.size} / {gear.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {gear.map((item, idx) => {
          const isChecked = checkedItems.has(idx);
          return (
            <button
              key={idx}
              onClick={() => toggleItem(idx)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                isChecked
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-slate-900/50 border border-transparent text-slate-300 active:bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 ${
                  isChecked
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-600 bg-slate-800"
                }`}
              >
                {isChecked && <Check className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-sm font-medium leading-tight ${isChecked ? "line-through opacity-70" : ""}`}>
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
