import React from "react";
import { ShieldCheck, ShieldAlert, Lock, AppWindow } from "lucide-react";
import { ExitCheckResponse } from "@/lib/schema";

interface Props {
  security: ExitCheckResponse["sections"]["smart_home_check"];
}

export default function HomeSecurityCard({ security }: Props) {
  if (!security) return null;
  const locked = /locked/i.test(security.doors_and_locks) && !/unlocked/i.test(security.doors_and_locks);
  const secure = security.appliances_cleared && locked;

  const rows = [
    { icon: Lock, title: "Doors", detail: security.doors_and_locks, ok: locked },
    { icon: AppWindow, title: "Windows & appliances", detail: security.windows, ok: security.appliances_cleared },
  ];

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-semibold">Home</h2>
        <span
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: secure ? "var(--green-soft)" : "var(--orange-soft)",
            color: secure ? "var(--green)" : "var(--orange)",
          }}
        >
          {secure ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          {secure ? "Secure" : "Check before leaving"}
        </span>
      </div>
      <ul>
        {rows.map(({ icon: Icon, title, detail, ok }, i) => (
          <li
            key={title}
            className="flex items-center gap-3.5 py-3"
            style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" style={{ color: ok ? "var(--green)" : "var(--orange)" }} />
            <div className="min-w-0">
              <p className="text-[15px] font-medium">{title}</p>
              <p className="text-[14px]" style={{ color: "var(--text-2)" }}>{detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
