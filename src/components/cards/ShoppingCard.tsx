"use client";

import React, { useState } from "react";
import { ShoppingBag, ChevronDown } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";

interface Props {
  shopping: ExitCheckResponse["sections"]["errands_and_shopping"];
}

export default function ShoppingCard({ shopping }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!shopping?.items || shopping.items.length === 0) return null;

  return (
    <section className="card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="pressable w-full flex items-center gap-3.5 p-4 text-left"
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--purple-soft)" }}>
          <ShoppingBag className="w-5 h-5" style={{ color: "var(--purple)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold leading-snug">
            {shopping.items.length} {shopping.items.length === 1 ? "item" : "items"} to pick up
          </p>
          <p className="text-[14px] truncate" style={{ color: "var(--text-2)" }}>
            {shopping.active_store_nearby}
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--text-3)" }}
        />
      </button>

      {expanded && (
        <ul className="px-4 pb-2">
          {shopping.items.map((item, idx) => (
            <li
              key={idx}
              className="py-3 text-[15px]"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
