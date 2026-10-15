import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExitCheckResponseSchema } from "@/lib/schema";
import {
  fetchGoogleCalendar,
  fetchCommuteEngine,
  fetchSmartHomeState,
  fetchShoppingList,
  fetchWeather,
} from "@/lib/mock-apis";
import {
  synthesize,
  quickActions,
  commuteDestinations,
  type SynthesisInput,
  type CommuteRoute,
} from "@/lib/synthesize";

function settled<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === "fulfilled" ? r.value : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tag_id, batteryLevel = null, isCharging = null, latitude, longitude } = body;

    // A signed-in session always wins over the user_id in the URL.
    const session = await getServerSession(authOptions);
    const user_id: string = session?.user?.id || body.user_id || "usr_123";

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { gearItems: true, integrations: true },
    });
    const gear = user?.gearItems.map((g) => g.name) ?? [];
    const connected = new Set(
      (user?.integrations ?? []).filter((i) => i.status === "connected").map((i) => i.provider)
    );

    // All sources are fetched concurrently; any one can fail without taking the HUD down.
    const [calendar, commute, smartHome, shopping, weather] = (
      await Promise.allSettled([
        fetchGoogleCalendar(user_id),
        fetchCommuteEngine(latitude, longitude, user?.homeAddress, user?.workAddress),
        fetchSmartHomeState(),
        fetchShoppingList(),
        fetchWeather(user_id, latitude, longitude),
      ])
    ).map((r) => settled(r as PromiseSettledResult<unknown>));

    const input: SynthesisInput = {
      batteryLevel,
      isCharging,
      gear,
      connected,
      calendar: calendar as SynthesisInput["calendar"],
      routes: ((commute as { routes?: CommuteRoute[] } | null)?.routes ?? []) as CommuteRoute[],
      smartHome: smartHome as SynthesisInput["smartHome"],
      shopping: shopping as SynthesisInput["shopping"],
      weather: weather as SynthesisInput["weather"],
    };

    const base = synthesize(input);

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(base);
    }

    try {
      const { object } = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: ExitCheckResponseSchema,
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
      ai.sections.quick_actions = quickActions(connected);
      ai.sections.calendar_commute.destinations = commuteDestinations(input.routes);
      ai.sections.errands_and_shopping = base.sections.errands_and_shopping;
      return NextResponse.json(ai);
    } catch (aiError) {
      console.warn("AI synthesis failed, using rule-based summary:", aiError instanceof Error ? aiError.message : aiError);
      return NextResponse.json(base);
    }
  } catch (error) {
    console.error("Error building ExitCheck:", error);
    return NextResponse.json(
      { error: "Failed to build your ExitCheck", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
