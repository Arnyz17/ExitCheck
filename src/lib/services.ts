/** Built-in data sources that are on unless the user switches them off. */
const DEFAULT_ON = new Set(["weather_api", "home_assistant"]);

export function isEnabled(provider: string, rows: { provider: string; status: string }[]) {
  const row = rows.find((r) => r.provider === provider);
  return row ? row.status === "connected" : DEFAULT_ON.has(provider);
}
