"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Clock, ShieldCheck, Flame, Zap, Cpu, Sparkles } from "lucide-react";
import Rise from "@/components/Rise";
import { MINUTES_PER_CATCH } from "@/lib/insights";

type Source = { name: string; ms: number; ok: boolean; error?: string; skipped?: boolean };
type Data = {
  summary: {
    scans: number;
    alertsCaught: number;
    minutesSaved: number;
    avgReadiness: number;
    cleanStreak: number;
    p50: number;
    p95: number;
    ai: { used: number; fellBack: number; ruleOnly: number };
    sources: { name: string; runs: number; successRate: number; p50: number; p95: number }[];
  };
  recent: { at: string; tag: string; totalMs: number; readiness: number; alerts: number; aiUsed: boolean }[];
  latest: { at: string; tag: string; totalMs: number; aiUsed: boolean; aiMs: number; aiError: string; sources: Source[] } | null;
};

function Count({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <>
      {v}
      {suffix}
    </>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const empty = data && data.summary.scans === 0;

  return (
    <div className="w-full max-w-[1024px] mx-auto px-4 sm:px-6 pb-24">
      <section className="text-center pt-12 sm:pt-20 pb-10 sm:pb-14">
        <p className="eyebrow">Insights</p>
        <h1 className="display gradient-text mt-3">Leaving, measured.</h1>
        <p className="text-[19px] sm:text-[22px] mt-4 max-w-[600px] mx-auto" style={{ color: "var(--text-2)" }}>
          What ExitCheck caught for you, and exactly how it works under the hood.
        </p>
      </section>

      {!data && <div className="shimmer rounded-[28px] h-[240px]" />}

      {empty && (
        <Rise>
          <div className="tile p-10 text-center">
            <p className="text-[21px] font-semibold">No taps yet</p>
            <p className="text-[15px] mt-1 mb-6" style={{ color: "var(--text-2)" }}>
              Open Today once and your first reading shows up here.
            </p>
            <Link href="/exit" className="pill">
              Run a check
            </Link>
          </div>
        </Rise>
      )}

      {data && !empty && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {[
              { icon: Activity, label: "Checks run", value: data.summary.scans, suffix: "", color: "var(--blue)" },
              { icon: Flame, label: "Problems caught", value: data.summary.alertsCaught, suffix: "", color: "var(--orange)" },
              { icon: Clock, label: "Minutes saved*", value: data.summary.minutesSaved, suffix: "", color: "var(--green)" },
              { icon: ShieldCheck, label: "Clean-exit streak", value: data.summary.cleanStreak, suffix: "", color: "var(--purple)" },
            ].map((m, i) => (
              <Rise key={m.label} delay={i * 0.05}>
                <div className="tile p-6">
                  <m.icon className="w-7 h-7" strokeWidth={1.6} style={{ color: m.color }} />
                  <p className="text-[48px] leading-none font-semibold tracking-[-0.04em] mt-5">
                    <Count to={m.value} suffix={m.suffix} />
                  </p>
                  <p className="text-[14px] mt-2" style={{ color: "var(--text-2)" }}>
                    {m.label}
                  </p>
                </div>
              </Rise>
            ))}
          </div>
          <p className="text-[12px] mt-3 px-2" style={{ color: "var(--text-3)" }}>
            *Estimate: each caught problem is assumed to avoid a {MINUTES_PER_CATCH}-minute trip back home.
          </p>

          <Rise>
            <section className="tile p-7 mt-12">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="eyebrow">Under the hood</p>
                  <h2 className="headline mt-1">Latest check</h2>
                  <p className="text-[15px] mt-1" style={{ color: "var(--text-2)" }}>
                    {data.latest?.tag || "Direct visit"} · {data.latest ? new Date(data.latest.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""} · {data.latest?.totalMs} ms end to end
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[13px] font-semibold"
                  style={{ background: data.latest?.aiUsed ? "var(--purple-soft)" : "var(--blue-soft)", color: data.latest?.aiUsed ? "var(--purple)" : "var(--blue)" }}
                >
                  {data.latest?.aiUsed ? <Sparkles className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
                  {data.latest?.aiUsed ? "Written by Gemini" : "Rule engine"}
                </span>
              </div>

              <div className="mt-7 flex flex-col gap-3.5">
                {data.latest?.sources.map((s) => {
                  const max = Math.max(...data.latest!.sources.map((x) => x.ms), 1);
                  return (
                    <div key={s.name} className="grid grid-cols-[110px_1fr_70px] sm:grid-cols-[140px_1fr_80px] items-center gap-3">
                      <span className="text-[14px] font-medium truncate">{s.name}</span>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: s.ok ? "var(--blue)" : "var(--red)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, (s.ms / max) * 100)}%` }}
                          transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.2 }}
                        />
                      </div>
                      <span className="text-[13px] text-right tabular-nums" style={{ color: s.ok ? "var(--text-2)" : "var(--red)" }}>
                        {s.skipped ? "not linked" : s.ok ? `${s.ms} ms` : "fell back"}
                      </span>
                    </div>
                  );
                })}
                {data.latest && !data.latest.aiUsed && data.latest.aiError && (
                  <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>
                    AI step skipped, rule engine answered instead: {data.latest.aiError}
                  </p>
                )}
              </div>
              <p className="text-[13px] mt-5" style={{ color: "var(--text-3)" }}>
                Sources run in parallel, so total time is the slowest one, not the sum. A failed source never blocks the screen.
              </p>
            </section>
          </Rise>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-5 mt-5">
            <Rise>
              <section className="tile p-7 h-full">
                <p className="eyebrow">Speed</p>
                <div className="flex gap-8 mt-3">
                  <div>
                    <p className="text-[44px] font-semibold tracking-[-0.04em] leading-none">{data.summary.p50}<span className="text-[18px] ml-1" style={{ color: "var(--text-2)" }}>ms</span></p>
                    <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>median</p>
                  </div>
                  <div>
                    <p className="text-[44px] font-semibold tracking-[-0.04em] leading-none">{data.summary.p95}<span className="text-[18px] ml-1" style={{ color: "var(--text-2)" }}>ms</span></p>
                    <p className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>95th percentile</p>
                  </div>
                </div>
                <div className="flex items-end gap-1.5 h-24 mt-7">
                  {[...data.recent].reverse().map((r, i) => {
                    const max = Math.max(...data.recent.map((x) => x.totalMs), 1);
                    return (
                      <motion.div
                        key={i}
                        title={`${r.totalMs} ms`}
                        className="flex-1 rounded-t-md"
                        style={{ background: r.alerts ? "var(--orange)" : "var(--blue)", opacity: 0.85 }}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(6, (r.totalMs / max) * 100)}%` }}
                        transition={{ type: "spring", stiffness: 90, damping: 16, delay: i * 0.03 }}
                      />
                    );
                  })}
                </div>
                <p className="text-[12px] mt-2" style={{ color: "var(--text-3)" }}>
                  Last {data.recent.length} checks. Orange bars had a problem to flag.
                </p>
              </section>
            </Rise>

            <Rise delay={0.06}>
              <section className="tile p-7 h-full">
                <p className="eyebrow">Source reliability</p>
                <ul className="mt-3">
                  {data.summary.sources.map((s, i) => (
                    <li key={s.name} className={`flex items-center justify-between py-3.5 ${i > 0 ? "hairline" : ""}`}>
                      <div>
                        <p className="text-[16px] font-medium">{s.name}</p>
                        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                          p50 {s.p50} ms · p95 {s.p95} ms · {s.runs} runs
                        </p>
                      </div>
                      <span
                        className="text-[14px] font-semibold px-3 h-8 inline-flex items-center rounded-full"
                        style={{
                          background: s.successRate >= 95 ? "var(--green-soft)" : s.successRate >= 70 ? "var(--orange-soft)" : "var(--red-soft)",
                          color: s.successRate >= 95 ? "var(--green)" : s.successRate >= 70 ? "var(--orange)" : "var(--red)",
                        }}
                      >
                        {s.successRate}%
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="hairline pt-4 mt-1 flex items-center gap-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                  <Zap className="w-4 h-4" style={{ color: "var(--purple)" }} />
                  AI wrote {data.summary.ai.used} · fell back {data.summary.ai.fellBack} · rules only {data.summary.ai.ruleOnly}
                </div>
              </section>
            </Rise>
          </div>
        </>
      )}
    </div>
  );
}
