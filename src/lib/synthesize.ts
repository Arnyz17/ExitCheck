import type { ExitCheckResponse } from "./schema";

type Alert = ExitCheckResponse["sections"]["critical_alerts"][number];
type Action = NonNullable<ExitCheckResponse["sections"]["quick_actions"]>[number];

export interface CommuteRoute {
  label: string;
  raw_origin: string;
  raw_destination: string;
  driving: { time: number; condition: string };
  transit: { time: number; condition: string };
  walking: { time: number };
}

export interface SynthesisInput {
  batteryLevel: number | null;
  isCharging: boolean | null;
  gear: string[];
  connected: Set<string>;
  calendar: { next_event?: string; event_time?: string; error?: string } | null;
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
        transit: `${r.transit.time} min`,
        walking: `${r.walking.time} min`,
      },
    }));
}

export function quickActions(connected: Set<string>): Action[] {
  const actions: Action[] = [];
  if (connected.has("tesla_api")) {
    actions.push({ id: "tesla_climate_start", label: "Start car climate", icon: "car", endpoint: "/api/actions" });
  }
  if (connected.has("home_assistant")) {
    actions.push({ id: "garage_door_close", label: "Close garage", icon: "door-open", endpoint: "/api/actions" });
  }
  return actions;
}

/** Deterministic HUD built straight from the live data. Used when no AI key is set or the model call fails. */
export function synthesize(input: SynthesisInput): ExitCheckResponse {
  const alerts: Alert[] = [];
  const gear = [...input.gear];
  const rainy = (input.weather?.precipitation_chance ?? 0) >= 40;

  const unlocked = input.smartHome?.sensors.filter((s) => s.id.startsWith("door") && s.status !== "LOCKED") ?? [];
  const openWindows = input.smartHome?.sensors.filter((s) => s.id.startsWith("window") && s.status === "OPEN") ?? [];
  const hot = input.smartHome?.appliances.filter((a) => a.status === "ACTIVE") ?? [];

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
    const fastest = route.driving.time <= route.transit.time ? "drive" : "take transit";
    recommendation = `${route.label} is about ${Math.min(route.driving.time, route.transit.time)} min away — ${fastest}.`;
  }

  const w = input.weather;
  const weather = w
    ? {
        temp_range: `${w.low}° – ${w.high}°F`,
        condition: `${w.forecast}, ${w.current_temp}°F now`,
        action: rainy ? `${w.precipitation_chance}% chance of rain — take an umbrella` : "",
      }
    : { temp_range: "", condition: "", action: "" };

  const clear = alerts.length === 0;
  return {
    status: "success",
    timestamp: new Date().toISOString(),
    display_theme: alerts.some((a) => a.severity === "CRITICAL") ? "critical" : clear ? "success" : "alert_warning",
    sections: {
      critical_alerts: alerts,
      quick_actions: quickActions(input.connected),
      calendar_commute: {
        next_event: hasEvent ? input.calendar!.next_event! : null,
        event_time: hasEvent ? input.calendar!.event_time || "N/A" : "N/A",
        destinations: commuteDestinations(input.routes),
        recommendation,
      },
      smart_home_check: input.smartHome
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
