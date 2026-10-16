"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Lock, AppWindow } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";
import Rise from "../Rise";

export default function HomeSecurityCard({ security }: { security: ExitCheckResponse["sections"]["smart_home_check"] }) {
  if (!security || !security.doors_and_locks) return null;
  const locked = /locked/i.test(security.doors_and_locks) && !/unlocked/i.test(security.doors_and_locks);
  const secure = security.appliances_cleared && locked;
  const Shield = secure ? ShieldCheck : ShieldAlert;

  const rows = [
    { icon: Lock, title: "Doors", detail: security.doors_and_locks, ok: locked },
    { icon: AppWindow, title: "Windows & appliances", detail: security.windows, ok: security.appliances_cleared },
  ];

  return (
    <Rise>
      <section className="tile p-7 h-full min-h-[200px]">
        <div className="flex items-start justify-between">
          <p className="eyebrow">Home</p>
          <motion.span
            initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
            whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.2 }}
          >
            <Shield className="w-9 h-9" strokeWidth={1.5} style={{ color: secure ? "var(--green)" : "var(--orange)" }} />
          </motion.span>
        </div>
        <p className="text-[24px] font-semibold tracking-tight mt-4">{secure ? "Everything's secure" : "Check before leaving"}</p>
        <ul className="mt-4">
          {rows.map(({ icon: Icon, title, detail, ok }, i) => (
            <li key={title} className={`flex items-center gap-3 py-3 ${i > 0 ? "hairline" : ""}`}>
              <Icon className="w-5 h-5 shrink-0" style={{ color: ok ? "var(--green)" : "var(--orange)" }} />
              <div className="min-w-0">
                <p className="text-[15px] font-medium">{title}</p>
                <p className="text-[14px]" style={{ color: "var(--text-2)" }}>
                  {detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Rise>
  );
}
