import { describe, it, expect } from "vitest";
import { percentile, cleanStreak, summarize, type LogRow } from "@/lib/insights";
import { isEnabled } from "@/lib/services";

const log = (over: Partial<LogRow> = {}): LogRow => ({
  createdAt: new Date(),
  tagName: "Front door",
  totalMs: 100,
  aiUsed: false,
  aiMs: 0,
  aiError: "",
  sources: JSON.stringify([{ name: "Weather", ms: 50, ok: true }]),
  alertCount: 0,
  gearCount: 3,
  readiness: 100,
  alertKinds: "",
  ...over,
});

describe("insights", () => {
  it("computes percentiles", () => {
    expect(percentile([], 50)).toBe(0);
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
    expect(percentile([10, 20, 30, 40, 50], 95)).toBe(50);
  });

  it("counts the clean-exit streak from the newest scan", () => {
    expect(cleanStreak([{ alertCount: 0 }, { alertCount: 0 }, { alertCount: 2 }, { alertCount: 0 }])).toBe(2);
    expect(cleanStreak([{ alertCount: 1 }])).toBe(0);
  });

  it("summarizes catches, savings and source reliability", () => {
    const s = summarize([
      log({ alertCount: 2, readiness: 60, totalMs: 300 }),
      log({ sources: JSON.stringify([{ name: "Weather", ms: 70, ok: false, error: "x" }]) }),
    ]);
    expect(s.scans).toBe(2);
    expect(s.alertsCaught).toBe(2);
    expect(s.minutesSaved).toBe(20);
    expect(s.avgReadiness).toBe(80);
    expect(s.sources[0]).toMatchObject({ name: "Weather", runs: 2, successRate: 50 });
  });

  it("tolerates corrupt source JSON", () => {
    expect(() => summarize([log({ sources: "not json" })])).not.toThrow();
  });
});

describe("services", () => {
  it("defaults built-in sources on and respects explicit choices", () => {
    expect(isEnabled("weather_api", [])).toBe(true);
    expect(isEnabled("weather_api", [{ provider: "weather_api", status: "disconnected" }])).toBe(false);
    expect(isEnabled("google_calendar", [])).toBe(false);
  });
});
