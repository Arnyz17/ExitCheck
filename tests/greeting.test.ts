import { describe, it, expect } from "vitest";
import { dayMessage } from "@/lib/greeting";

const at = (iso: string) => new Date(iso); // local time, 2026-10-16 is a Friday

describe("dayMessage", () => {
  it("talks about class once classes are done", () => {
    const m = dayMessage(at("2026-10-16T16:30:00"), { total: 3, done: 3, hasClass: true });
    expect(m).toMatch(/class/i);
  });
  it("wishes luck before the first event of the day", () => {
    expect(dayMessage(at("2026-10-16T08:00:00"), { total: 2, done: 0, hasClass: true })).toMatch(/class/i);
  });
  it("notes an empty calendar", () => {
    expect(dayMessage(at("2026-10-15T10:00:00"), { total: 0, done: 0, hasClass: false })).toMatch(/calendar/i);
  });
  it("works with no calendar linked", () => {
    expect(dayMessage(at("2026-10-16T19:00:00"), null)).toMatch(/Friday|day|today/i);
    expect(dayMessage(at("2026-10-14T02:00:00"), null)).toMatch(/midnight/i);
  });
});
