import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/user";
import { isEnabled } from "@/lib/services";
import { ExitCheckResponseSchema } from "@/lib/schema";
import {
  fetchGoogleCalendar,
  fetchCommuteEngine,
  fetchSmartHomeState,
  fetchShoppingList,
  fetchWeather,
} from "@/lib/mock-apis";
import { synthesize, readiness, commuteDestinations, type SynthesisInput, type CommuteRoute } from "@/lib/synthesize";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const AI_TIMEOUT_MS = 2500;

// Circuit breaker: after repeated AI failures, skip the model for a while so taps stay fast.
const breaker = { failures: 0, openUntil: 0 };

type SourceTrace = { name: string; ms: number; ok: boolean; error?: string; skipped?: boolean };

/** Runs a source fetch and records how long it took and whether it worked. */
async function traced<T>(name: string, trace: SourceTrace[], fn: () => Promise<T>): Promise<T | null> {
  const t0 = performance.now();
  try {
    const value = await fn();
    const failed = value && typeof value === "object" && "error" in (value as object);
    const message = failed ? String((value as unknown as { error: unknown }).error) : undefined;
    // "Not connected" is a choice the user made, not a failure.
    const skipped = !!message && /^not connected/i.test(message);
    trace.push({ name, ms: Math.round(performance.now() - t0), ok: !failed || skipped, error: message, skipped });
    return failed ? null : value;
  } catch (e) {
    trace.push({ name, ms: Math.round(performance.now() - t0), ok: false, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function POST(request: Request) {
  const started = performance.now();
  try {
    const body = await request.json();
    const { tag_id, batteryLevel = null, isCharging = null, latitude, longitude } = body;

    // A signed-in session always wins over the user_id in the URL.
    const session = await getServerSession(authOptions);
    const user_id: string = session?.user?.id || body.user_id || "usr_123";

    await ensureUser(user_id);
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { gearItems: true, integrations: true, actions: { orderBy: { createdAt: "asc" } }, nfcTags: true },
    });

    const rows = user?.integrations ?? [];
    const weatherEnabled = isEnabled("weather_api", rows);
    const homeEnabled = isEnabled("home_assistant", rows);

    // The sticker that opened this page: its own checklist is merged with the global one.
    const found = typeof tag_id === "string" ? user?.nfcTags.find((t) => t.tagId === tag_id) : undefined;
    const tag = found ? { name: found.name, location: found.location } : null;
    const tagItems = (found?.items ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const gear = [...new Set([...(user?.gearItems.map((g) => g.name) ?? []), ...tagItems])];

    if (found && body.scan) {
      await prisma.nfcTag.update({
        where: { id: found.id },
        data: { scanCount: { increment: 1 }, lastScannedAt: new Date() },
      });
    }

    const actions = (user?.actions ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      endpoint: "/api/actions/run",
      kind: a.kind as "webhook" | "shortcut" | "link",
      href:
        a.kind === "shortcut"
          ? `shortcuts://run-shortcut?name=${encodeURIComponent(a.target)}`
          : a.kind === "link"
          ? a.target
          : undefined,
    }));

    // All sources run concurrently; any one can fail without taking the screen down.
    const trace: SourceTrace[] = [];
    const [calendar, commute, smartHome, shopping, weather] = await Promise.all([
      traced("Calendar", trace, () => fetchGoogleCalendar(user_id)),
      traced("Commute", trace, () => fetchCommuteEngine(latitude, longitude, user?.homeAddress, user?.workAddress)),
      homeEnabled ? traced("Home sensors", trace, () => fetchSmartHomeState()) : Promise.resolve(null),
      traced("Errands", trace, () => fetchShoppingList()),
      weatherEnabled ? traced("Weather", trace, () => fetchWeather(user_id, latitude, longitude)) : Promise.resolve(null),
    ]);

    const input: SynthesisInput = {
      batteryLevel,
      isCharging,
      gear,
      actions,
      weatherEnabled,
      homeEnabled,
      calendar: calendar as SynthesisInput["calendar"],
      routes: ((commute as { routes?: CommuteRoute[] } | null)?.routes ?? []) as CommuteRoute[],
      smartHome: smartHome as SynthesisInput["smartHome"],
      shopping: shopping as SynthesisInput["shopping"],
      weather: weather as SynthesisInput["weather"],
    };

    const base = synthesize(input);
    base.user_name = user?.name && user.name !== "ExitCheck User" ? user.name : null;
    base.tag = tag;
    base.tag_count = user?.nfcTags.length ?? 0;
    let final = base;
    let aiUsed = false;
    let aiMs = 0;
    let aiError = "";

    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && Date.now() < breaker.openUntil) {
      aiError = "Skipped: AI recently failed, retrying shortly";
    } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const t0 = performance.now();
      try {
        const { object } = await generateObject({
          model: google(MODEL),
          schema: ExitCheckResponseSchema,
          abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
          prompt: `
You are the ExitCheck assistant. Using the raw context below, write the content of a quick, glanceable
"before you leave" screen. Be brief and concrete; every alert must have a specific action.

Rules:
- Safety first: unlocked doors, open windows with rain likely, active heating appliances, phone battery under 20% while not charging.
- Then schedule and commute: meetings within 60 minutes, the best travel mode.
- required_gear_checklist must include every item in custom_gear_checklist; add weather-driven items (e.g. umbrella) when warranted.
- Leave critical_alerts empty when nothing needs attention.
- For calendar_commute.destinations, return an empty array (it is filled in separately).

Raw context:
${JSON.stringify({ tag_id, battery: { batteryLevel, isCharging }, custom_gear_checklist: gear, calendar, commute: input.routes, smart_home: smartHome, shopping, weather }, null, 2)}
`,
        });
        const ai = JSON.parse(JSON.stringify(object));
        // Facts that must be exact never come from the model.
        ai.timestamp = base.timestamp;
        ai.user_name = base.user_name;
        ai.tag = base.tag;
        ai.tag_count = base.tag_count;
        ai.sections.quick_actions = actions;
        ai.sections.calendar_commute.destinations = commuteDestinations(input.routes);
        ai.sections.errands_and_shopping = base.sections.errands_and_shopping;
        ai.sections.weather_directive = base.sections.weather_directive;
        ai.sections.smart_home_check = base.sections.smart_home_check;
        ai.sections.required_gear_checklist = [...new Set([...gear, ...(ai.sections.required_gear_checklist ?? [])])];
        ai.readiness = readiness(ai.sections.critical_alerts);
        final = ai;
        aiUsed = true;
        breaker.failures = 0;
      } catch (e) {
        aiError = e instanceof Error ? e.message.slice(0, 160) : "AI call failed";
        if (++breaker.failures >= 2) breaker.openUntil = Date.now() + 5 * 60_000;
        console.warn("AI synthesis failed, using rule-based summary:", aiError);
      }
      aiMs = Math.round(performance.now() - t0);
    }

    const totalMs = Math.round(performance.now() - started);
    if (body.scan) {
      await prisma.scanLog
        .create({
          data: {
            userId: user_id,
            tagName: tag?.name ?? "",
            totalMs,
            aiUsed,
            aiMs,
            aiError,
            sources: JSON.stringify(trace),
            alertCount: final.sections.critical_alerts.length,
            gearCount: final.sections.required_gear_checklist.length,
            readiness: final.readiness?.score ?? 100,
            alertKinds: final.sections.critical_alerts.map((a) => a.id.replace(/_\d+$/, "")).join(","),
          },
        })
        .catch((e) => console.warn("scan log failed", e));
    }

    return NextResponse.json(final);
  } catch (error) {
    console.error("Error building ExitCheck:", error);
    return NextResponse.json(
      { error: "Failed to build your ExitCheck", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
