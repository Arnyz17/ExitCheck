import { describe, it, expect } from "vitest";
import { synthesize, readiness, type SynthesisInput } from "@/lib/synthesize";
import { ExitCheckResponseSchema } from "@/lib/schema";

const base: SynthesisInput = {
  batteryLevel: 0.9,
  isCharging: false,
  gear: ["Keys", "Wallet"],
  actions: [],
  weatherEnabled: true,
  homeEnabled: true,
  calendar: null,
  routes: [],
  smartHome: { sensors: [{ id: "door_main", status: "LOCKED" }], appliances: [] },
  shopping: null,
  weather: { current_temp: 60, forecast: "Clear", high: 68, low: 55, precipitation_chance: 0 },
};

describe("synthesize", () => {
  it("returns a clean exit with a perfect score when nothing is wrong", () => {
    const out = synthesize(base);
    expect(out.sections.critical_alerts).toHaveLength(0);
    expect(out.readiness?.score).toBe(100);
    expect(out.display_theme).toBe("success");
  });

  it("flags an unlocked door as critical", () => {
    const out = synthesize({ ...base, smartHome: { sensors: [{ id: "door_main", status: "UNLOCKED" }], appliances: [] } });
    expect(out.sections.critical_alerts[0].severity).toBe("CRITICAL");
    expect(out.readiness!.score).toBe(65);
    expect(out.display_theme).toBe("critical");
  });

  it("flags an active heater and an open window only when rain is likely", () => {
    const sensors = [{ id: "window_balcony", status: "OPEN" }];
    const dry = synthesize({ ...base, smartHome: { sensors, appliances: [] } });
    expect(dry.sections.critical_alerts).toHaveLength(0);
    const wet = synthesize({
      ...base,
      weather: { ...base.weather!, precipitation_chance: 80 },
      smartHome: { sensors, appliances: [{ name: "Space Heater", status: "ACTIVE", power_draw: "1500W" }] },
    });
    expect(wet.sections.critical_alerts.map((a) => a.id)).toEqual(["appliance_0", "window_rain"]);
  });

  it("adds an umbrella to the gear list when rain is likely", () => {
    const out = synthesize({ ...base, weather: { ...base.weather!, precipitation_chance: 70 } });
    expect(out.sections.required_gear_checklist).toContain("Umbrella");
  });

  it("warns about low battery and adds a power bank", () => {
    const out = synthesize({ ...base, batteryLevel: 0.12 });
    expect(out.sections.critical_alerts.some((a) => a.id === "battery")).toBe(true);
    expect(out.sections.required_gear_checklist).toContain("Power bank");
  });

  it("does not warn about low battery while charging", () => {
    const out = synthesize({ ...base, batteryLevel: 0.1, isCharging: true });
    expect(out.sections.critical_alerts).toHaveLength(0);
  });

  it("hides the home section and its alerts when the home source is off", () => {
    const out = synthesize({
      ...base,
      homeEnabled: false,
      smartHome: { sensors: [{ id: "door_main", status: "UNLOCKED" }], appliances: [] },
    });
    expect(out.sections.critical_alerts).toHaveLength(0);
    expect(out.sections.smart_home_check.doors_and_locks).toBe("");
  });

  it("drops destinations you are already at", () => {
    const route = (label: string, t: number) => ({
      label,
      raw_origin: "A",
      raw_destination: label,
      driving: { time: t, condition: "" },
      transit: { time: t * 2, condition: "" },
      walking: { time: t * 10 },
    });
    const out = synthesize({ ...base, routes: [route("Home", 0), route("Work", 12)] });
    expect(out.sections.calendar_commute.destinations.map((d) => d.label)).toEqual(["Work"]);
  });

  it("always produces output that satisfies the response schema", () => {
    expect(ExitCheckResponseSchema.safeParse(synthesize(base)).success).toBe(true);
    expect(ExitCheckResponseSchema.safeParse(synthesize({ ...base, smartHome: null, weather: null })).success).toBe(true);
  });
});

describe("readiness", () => {
  it("never goes below zero", () => {
    expect(readiness(Array(5).fill({ severity: "CRITICAL" })).score).toBe(0);
  });
  it("labels bands", () => {
    expect(readiness([]).label).toBe("Ready to go");
    expect(readiness([{ severity: "HIGH" }]).label).toBe("Almost there");
  });
});
