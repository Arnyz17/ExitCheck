import type { ExitCheckResponse } from "./schema";

type Alert = ExitCheckResponse["sections"]["critical_alerts"][number];
type Action = NonNullable<ExitCheckResponse["sections"]["quick_actions"]>[number];

export interface CommuteRoute {
  label: string;
  raw_origin: string;
  raw_destination: string;
  driving: { time: number; condition: string };
  transit: { time: number; condition: string };
  source?: "google" | "estimate";
  walking: { time: number };
}

export interface SynthesisInput {
  batteryLevel: number | null;
  isCharging: boolean | null;
  gear: string[];
  actions: Action[];
  weatherEnabled: boolean;
  homeEnabled: boolean;
  calendar: { next_event?: string; event_time?: string; start_iso?: string | null; error?: string } | null;
  now?: Date;
  routes: CommuteRoute[];
  smartHome: {
    sensors: { id: string; status: string }[];
    appliances: { name: string; status: string; power_draw: string }[];
  } | null;
  shopping: { active_store_nearby: string; items: string[] } | null;
  weather: {
    current_temp: number;
    forecast: string;
    high: number;
    low: number;
    precipitation_chance: number;
  } | null;
}

export function commuteDestinations(routes: CommuteRoute[]) {
  return routes
    // Skip destinations you're already at (0 min away).
    .filter((r) => r.raw_destination && r.driving.time > 0)
    .map((r) => ({
      label: r.label,
      address: r.raw_destination,
      raw_origin: r.raw_origin,
      raw_destination: r.raw_destination,
      travel_options: {
        driving: `${r.driving.time} min`,
        transit: r.transit.time > 0 ? `${r.transit.time} min` : "n/a",
        walking: `${r.walking.time} min`,
      },
      source: r.source ?? "estimate",
    }));
}

const PENALTY: Record<Alert["severity"], number> = { CRITICAL: 35, HIGH: 20, MEDIUM: 10, LOW: 5 };

/** 0-100 "ready to leave" score. Every open problem costs points; a clean exit is 100. */
export function readiness(alerts: Pick<Alert, "severity">[]) {
  const base = 100 - alerts.reduce((n, a) => n + PENALTY[a.severity], 0);
  const score = Math.max(0, Math.min(100, base));
  const label = score >= 90 ? "Ready to go" : score >= 70 ? "Almost there" : score >= 40 ? "Needs attention" : "Hold on";
  return { score, label };
}

export const ARRIVAL_BUFFER_MIN = 10;

/** When to walk out so you arrive ARRIVAL_BUFFER_MIN early, using the fastest of driving and transit. */
export function leaveBy(startIso: string | null | undefined, routes: CommuteRoute[]) {
  if (!startIso) return null;
  const route = routes.find((r) => r.raw_destination && r.driving.time > 0);
  if (!route) return null;
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return null;
  const travel = route.transit.time > 0 ? Math.min(route.driving.time, route.transit.time) : route.driving.time;
  return new Date(start - (travel + ARRIVAL_BUFFER_MIN) * 60_000).toISOString();
}

/** Deterministic HUD built straight from the live data. Used when no AI key is set or the model call fails. */
export function synthesize(input: SynthesisInput): ExitCheckResponse {
  const alerts: Alert[] = [];
  const gear = [...input.gear];
  const rainy = input.weatherEnabled && (input.weather?.precipitation_chance ?? 0) >= 40;

  const home = input.homeEnabled ? input.smartHome : null;
  const unlocked = home?.sensors.filter((s) => s.id.startsWith("door") && s.status !== "LOCKED") ?? [];
  const openWindows = home?.sensors.filter((s) => s.id.startsWith("window") && s.status === "OPEN") ?? [];
  const hot = home?.appliances.filter((a) => a.status === "ACTIVE") ?? [];

  hot.forEach((a, i) =>
    alerts.push({
      id: `appliance_${i}`,
      icon: "flame",
      severity: "HIGH",
      message: `${a.name} is on (${a.power_draw})`,
      action: `Turn off the ${a.name.toLowerCase()} before you leave`,
    })
  );
  unlocked.forEach((d, i) =>
    alerts.push({
      id: `door_${i}`,
      icon: "alert-triangle",
      severity: "CRITICAL",
      message: "A door is unlocked",
      action: "Lock it before you leave",
    })
  );
  if (openWindows.length && rainy) {
    alerts.push({
      id: "window_rain",
      icon: "alert-triangle",
      severity: "HIGH",
      message: `Window is open and rain is likely (${input.weather?.precipitation_chance}%)`,
      action: "Close the window",
    });
  }
  if (input.batteryLevel !== null && input.batteryLevel < 0.2 && !input.isCharging) {
    alerts.push({
      id: "battery",
      icon: "battery-charging",
      severity: "CRITICAL",
      message: `Phone battery is at ${Math.round(input.batteryLevel * 100)}%`,
      action: "Bring a charger or power bank",
    });
    if (!gear.includes("Power bank")) gear.push("Power bank");
  }
  if (rainy && !gear.some((g) => /umbrella/i.test(g))) gear.push("Umbrella");

  const route = input.routes.find((r) => r.raw_destination && r.driving.time > 0);
  const hasEvent = !!input.calendar?.next_event && !input.calendar.error;
  let recommendation = "";
  if (route) {
    const transitOk = route.transit.time > 0;
    const fastest = !transitOk || route.driving.time <= route.transit.time ? "drive" : "take transit";
    const best = transitOk ? Math.min(route.driving.time, route.transit.time) : route.driving.time;
    recommendation = `${route.label} is about ${best} min away. ${fastest === "drive" ? "Drive" : "Take transit"}${route.source === "google" ? ", based on current traffic" : ""}.`;
  }

  const w = input.weatherEnabled ? input.weather : null;
  const weather = w
    ? {
        current_temp: w.current_temp,
        temp_range: `${w.low}° / ${w.high}°`,
        condition: w.forecast,
        action: rainy ? `${w.precipitation_chance}% chance of rain. Take an umbrella.` : "No rain expected.",
      }
    : { temp_range: "", condition: "", action: "" };

  const clear = alerts.length === 0;
  return {
    status: "success",
    timestamp: new Date().toISOString(),
    readiness: readiness(alerts),
    user_name: null,
    tag: null,
    display_theme: alerts.some((a) => a.severity === "CRITICAL") ? "critical" : clear ? "success" : "alert_warning",
    sections: {
      critical_alerts: alerts,
      quick_actions: input.actions,
      calendar_commute: {
        next_event: hasEvent ? input.calendar!.next_event! : null,
        event_time: hasEvent ? input.calendar!.event_time || "N/A" : "N/A",
        destinations: commuteDestinations(input.routes),
        leave_by: hasEvent ? leaveBy(input.calendar?.start_iso, input.routes) : null,
        recommendation,
      },
      smart_home_check: !input.homeEnabled
        ? { doors_and_locks: "", windows: "", appliances_cleared: true }
        : home
        ? {
            doors_and_locks: unlocked.length ? "Unlocked" : "All locked",
            windows: openWindows.length ? "A window is open" : hot.length ? `${hot[0].name} is on` : "Windows closed, appliances off",
            appliances_cleared: hot.length === 0 && openWindows.length === 0,
          }
        : { doors_and_locks: "Home hub unreachable", windows: "Status unavailable", appliances_cleared: false },
      errands_and_shopping: input.shopping ?? { active_store_nearby: "", items: [] },
      weather_directive: weather,
      required_gear_checklist: gear,
    },
  };
}
