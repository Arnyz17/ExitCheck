import type { SynthesisInput } from "./synthesize";

export type HaConfig = { url: string; token: string };
export type GoveeConfig = { token: string };

const HEAT = /heater|iron|stove|oven|kettle|toaster|fryer|space/i;

function haBase(url: string) {
  return url.replace(/\/+$/, "");
}

async function haFetch(cfg: HaConfig, path: string, init?: RequestInit) {
  const res = await fetch(`${haBase(cfg.url)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Home Assistant rejected the token" : `Home Assistant responded ${res.status}`);
  return res;
}

export async function haCheck(cfg: HaConfig) {
  const res = await haFetch(cfg, "/api/");
  return (await res.json()) as { message?: string };
}

type HaState = { entity_id: string; state: string; attributes: { friendly_name?: string; device_class?: string } };

/** Reads Home Assistant (which fronts Kasa, Honeywell, Govee, Hue, Nest, Ring...) into the HUD's sensor shape. */
export async function haSnapshot(cfg: HaConfig): Promise<NonNullable<SynthesisInput["smartHome"]> & { lightsOn: number; total: number }> {
  const states: HaState[] = await (await haFetch(cfg, "/api/states")).json();
  const sensors: { id: string; status: string }[] = [];
  const appliances: { name: string; status: string; power_draw: string }[] = [];
  let lightsOn = 0;

  for (const s of states) {
    const name = s.attributes.friendly_name ?? s.entity_id;
    const [domain] = s.entity_id.split(".");
    if (domain === "lock") sensors.push({ id: `door_${s.entity_id}`, status: s.state === "locked" ? "LOCKED" : "UNLOCKED" });
    else if (domain === "binary_sensor" && s.attributes.device_class === "window")
      sensors.push({ id: `window_${s.entity_id}`, status: s.state === "on" ? "OPEN" : "CLOSED" });
    else if (domain === "light" && s.state === "on") lightsOn++;
    else if ((domain === "switch" || domain === "climate") && HEAT.test(name) && !["off", "unavailable"].includes(s.state))
      appliances.push({ name, status: "ACTIVE", power_draw: "on" });
  }
  return { sensors, appliances, lightsOn, total: states.length };
}

export async function haLightsOff(cfg: HaConfig) {
  await haFetch(cfg, "/api/services/light/turn_off", { method: "POST", body: JSON.stringify({ entity_id: "all" }) });
}

const GOVEE = "https://openapi.api.govee.com/router/api/v1";

export async function goveeDevices(cfg: GoveeConfig) {
  const res = await fetch(`${GOVEE}/user/devices`, { headers: { "Govee-API-Key": cfg.token }, signal: AbortSignal.timeout(6000) });
  if (res.status === 401) throw new Error("Govee rejected the API key");
  if (!res.ok) throw new Error(`Govee responded ${res.status}`);
  const body = await res.json();
  return (body.data ?? []) as { device: string; sku: string; deviceName: string; capabilities?: { type: string }[] }[];
}

export async function goveeAllOff(cfg: GoveeConfig) {
  const devices = await goveeDevices(cfg);
  const switchable = devices.filter((d) => d.capabilities?.some((c) => c.type === "devices.capabilities.on_off"));
  await Promise.all(
    switchable.map((d) =>
      fetch(`${GOVEE}/device/control`, {
        method: "POST",
        headers: { "Govee-API-Key": cfg.token, "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          payload: { sku: d.sku, device: d.device, capability: { type: "devices.capabilities.on_off", instance: "powerSwitch", value: 0 } },
        }),
        signal: AbortSignal.timeout(6000),
      })
    )
  );
  return switchable.length;
}
