/** Finds a film poster thumbnail via Wikipedia (no API key). Returns "" when nothing matches. */
export async function findPoster(title: string): Promise<string> {
  const summary = async (page: string) => {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.replace(/ /g, "_"))}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return "";
    const d = await res.json();
    return typeof d.thumbnail?.source === "string" ? d.thumbnail.source.split("?")[0] : "";
  };
  try {
    const direct = (await summary(`${title} (film)`)) || (await summary(title));
    if (direct) return direct;
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(`${title} film`)}&limit=1&format=json`,
      { signal: AbortSignal.timeout(4000) }
    );
    const found = (await res.json())?.[1]?.[0];
    return found ? await summary(found) : "";
  } catch {
    return "";
  }
}
