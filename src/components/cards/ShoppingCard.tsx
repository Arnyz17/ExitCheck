"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, ChevronDown } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";
import Rise from "../Rise";

export default function ShoppingCard({ shopping }: { shopping: ExitCheckResponse["sections"]["errands_and_shopping"] }) {
  const [open, setOpen] = useState(false);
  if (!shopping?.items || shopping.items.length === 0) return null;
  const n = shopping.items.length;

  return (
    <Rise>
      <section className="tile overflow-hidden h-full">
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full p-7 text-left">
          <div className="flex items-start justify-between">
            <p className="eyebrow">On your way</p>
            <ShoppingBag className="w-9 h-9" strokeWidth={1.5} style={{ color: "var(--purple)" }} />
          </div>
          <p className="text-[24px] font-semibold tracking-tight mt-4">
            {n} {n === 1 ? "thing" : "things"} to pick up
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[15px]" style={{ color: "var(--text-2)" }}>
              {shopping.active_store_nearby}
            </p>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
              <ChevronDown className="w-5 h-5" style={{ color: "var(--text-3)" }} />
            </motion.span>
          </div>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="px-7 overflow-hidden"
            >
              {shopping.items.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="hairline py-3.5 text-[16px]"
                >
                  {item}
                </motion.li>
              ))}
              <li className="h-3" />
            </motion.ul>
          )}
        </AnimatePresence>
      </section>
    </Rise>
  );
}
