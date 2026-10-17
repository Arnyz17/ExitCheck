"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Package } from "lucide-react";

const KEY = "exitcheck.building.dismissed";

/** Sample building-portal notice (BuildingLink style). Replace with a real feed when one is linked. */
export default function BuildingNotice() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === new Date().toDateString();
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, new Date().toDateString());
    } catch {}
  };

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          className="tile p-5 sm:p-6 flex items-center gap-4"
          initial={{ opacity: 0, x: -24, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, padding: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.45 }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--blue-soft)" }}>
            <Package className="w-6 h-6" style={{ color: "var(--blue)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-2)" }}>
              BuildingLink · Sample
            </p>
            <p className="text-[18px] font-semibold leading-snug">2 packages are waiting at the Tower 2 lobby</p>
            <p className="text-[15px] mt-0.5" style={{ color: "var(--blue)" }}>
              Pick them up on your way out
            </p>
          </div>
          <button onClick={dismiss} className="pill pill-plain !h-9 !px-4 shrink-0">
            Got it
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
