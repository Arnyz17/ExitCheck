export type SourceTrace = { name: string; ms: number; ok: boolean; error?: string; skipped?: boolean };

export interface LogRow {
  createdAt: Date | string;
  tagName: string;
  totalMs: number;
  aiUsed: boolean;
  aiMs: number;
  aiError: string;
  sources: string;
  alertCount: number;
  gearCount: number;
  readiness: number;
  alertKinds: string;
}

/** Assumption surfaced in the UI: each caught problem would otherwise cost a trip back. */
export const MINUTES_PER_CATCH = 10;

export function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export function parseSources(json: string): SourceTrace[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Consecutive most-recent scans with no alerts. */
export function cleanStreak(logsNewestFirst: Pick<LogRow, "alertCount">[]) {
  let n = 0;
  for (const l of logsNewestFirst) {
    if (l.alertCount > 0) break;
    n++;
  }
  return n;
}

export function summarize(logsNewestFirst: LogRow[]) {
  const n = logsNewestFirst.length;
  const alertsCaught = logsNewestFirst.reduce((s, l) => s + l.alertCount, 0);
  const latencies = logsNewestFirst.map((l) => l.totalMs);
  const bySource = new Map<string, { runs: number; ok: number; ms: number[] }>();
  for (const l of logsNewestFirst) {
    for (const s of parseSources(l.sources)) {
      if (s.skipped) continue;
      const e = bySource.get(s.name) ?? { runs: 0, ok: 0, ms: [] };
      e.runs++;
      if (s.ok) e.ok++;
      e.ms.push(s.ms);
      bySource.set(s.name, e);
    }
  }
  const aiRuns = logsNewestFirst.filter((l) => l.aiUsed).length;
  const fallbacks = logsNewestFirst.filter((l) => !l.aiUsed && l.aiError).length;

  return {
    scans: n,
    alertsCaught,
    minutesSaved: alertsCaught * MINUTES_PER_CATCH,
    avgReadiness: n ? Math.round(logsNewestFirst.reduce((s, l) => s + l.readiness, 0) / n) : 0,
    cleanStreak: cleanStreak(logsNewestFirst),
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    ai: { used: aiRuns, fellBack: fallbacks, ruleOnly: n - aiRuns - fallbacks },
    sources: [...bySource.entries()].map(([name, v]) => ({
      name,
      runs: v.runs,
      successRate: Math.round((v.ok / v.runs) * 100),
      p50: percentile(v.ms, 50),
      p95: percentile(v.ms, 95),
    })),
  };
}
