import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExitCheckResponseSchema } from '@/lib/schema';
import {
  fetchGoogleCalendar,
  fetchCommuteEngine,
  fetchSmartHomeState,
  fetchShoppingList,
  fetchWeather,
} from '@/lib/mock-apis';

// A mock fallback for when OPENAI_API_KEY is missing during local dev
const MOCK_AI_RESPONSE = {
  status: "success",
  timestamp: new Date().toISOString(),
  display_theme: "alert_warning",
  sections: {
    quick_actions: [
      {
        id: "tesla_climate_start",
        label: "Start Tesla Climate",
        icon: "car",
        endpoint: "/api/actions"
      },
      {
        id: "garage_door_close",
        label: "Close Garage",
        icon: "door-open",
        endpoint: "/api/actions"
      }
    ],
    critical_alerts: [
      {
        id: "alert_1",
        icon: "flame",
        severity: "HIGH",
        message: "Bedroom Space Heater drawing active power",
        action: "Turn off heater before leaving",
      }
    ],
    calendar_commute: {
      next_event: "Client Strategy Pitch",
      event_time: "9:00 AM",
      destinations: [
        {
          label: "Home",
          address: "123 Mock Home St",
          raw_origin: "Current Location",
          raw_destination: "123 Mock Home St",
          travel_options: {
            driving: "15 min (3.2 mi)",
            transit: "24 min (3.2 mi)",
            walking: "45 min",
          }
        },
        {
          label: "Work",
          address: "456 Mock Work Ave",
          raw_origin: "Current Location",
          raw_destination: "456 Mock Work Ave",
          travel_options: {
            driving: "22 min (5.1 mi)",
            transit: "31 min (5.1 mi)",
            walking: "60 min",
          }
        }
      ],
      recommendation: "LEAVE NOW via Bus 42 or Car for Work",
    },
    smart_home_check: {
      doors_and_locks: "ALL LOCKED",
      windows: "Balcony window OPEN (Rain expected at 3 PM)",
      appliances_cleared: false,
    },
    errands_and_shopping: {
      active_store_nearby: "Target (0.4 mi on route)",
      items: ["Whole Milk", "Paper Towels", "Coffee Beans"],
    },
    weather_directive: {
      temp_range: "72°F to 85°F",
      condition: "Rain expected at 3 PM",
      action: "Grab Umbrella & wear light jacket",
    },
    required_gear_checklist: [
      "Access Badge",
      "Laptop",
      "Umbrella",
    ],
  },
};

import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tag_id, batteryLevel, isCharging, latitude, longitude } = body;

    // Resolve user: session takes priority over URL param for security
    const session = await getServerSession(authOptions);
    const user_id = session?.user?.id || body.user_id || 'usr_123';

    // Fetch user gear from DB
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { gearItems: true }
    });
    
    const dbGear = user?.gearItems.map(g => g.name) || [];

    // Fetch live external data concurrently for maximum speed
    const results = await Promise.allSettled([
      fetchGoogleCalendar(user_id),
      fetchCommuteEngine(latitude, longitude, user?.homeAddress, user?.workAddress),
      fetchSmartHomeState(),
      fetchShoppingList(),
      fetchWeather(user_id, latitude, longitude),
    ]);

    // Extract successful values or provide safe defaults for failed APIs
    const [calendarResult, commuteResult, smartHomeResult, shoppingResult, weatherResult] = results;

    const context = {
      user_id,
      tag_id,
      device_battery: { batteryLevel, isCharging },
      custom_gear_checklist: dbGear,
      calendar: calendarResult.status === 'fulfilled' ? calendarResult.value : null,
      commute: commuteResult.status === 'fulfilled' ? commuteResult.value : null,
      smart_home: smartHomeResult.status === 'fulfilled' ? smartHomeResult.value : null,
      shopping: shoppingResult.status === 'fulfilled' ? shoppingResult.value : null,
      weather: weatherResult.status === 'fulfilled' ? weatherResult.value : null,
    };

    // Include battery logic in context
    if (batteryLevel !== null && batteryLevel < 0.2 && !isCharging) {
      if (!context.smart_home) {
         context.smart_home = { sensors: [], appliances: [] };
      }
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      // Return mock response if no API key is provided
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockResponse = JSON.parse(JSON.stringify(MOCK_AI_RESPONSE));
      
      // Inject real DB gear if we have any, otherwise use default mock gear
      if (dbGear.length > 0) {
        mockResponse.sections.required_gear_checklist = dbGear;
      }
      
      if (batteryLevel !== null && batteryLevel < 0.2 && !isCharging) {
        mockResponse.sections.critical_alerts.push({
          id: "alert_battery",
          icon: "battery-charging",
          severity: "CRITICAL",
          message: `Phone battery at ${Math.round(batteryLevel * 100)}%`,
          action: "Grab portable power bank",
        });
        if (!mockResponse.sections.required_gear_checklist.includes("Power Bank")) {
          mockResponse.sections.required_gear_checklist.push("Power Bank");
        }
      }

      // ALWAYS inject real commute data directly from OSRM (never trust mock/AI for this)
      const commuteData = commuteResult.status === 'fulfilled' ? commuteResult.value : null;
      if (commuteData && commuteData.routes && commuteData.routes.length > 0) {
        mockResponse.sections.calendar_commute.destinations = commuteData.routes.map((r: any) => ({
          label: r.label,
          address: r.raw_destination || "N/A",
          raw_origin: r.raw_origin || "",
          raw_destination: r.raw_destination || "",
          travel_options: {
            driving: `${r.driving.time} min ${r.driving.condition}`,
            transit: `${r.transit.time} min ${r.transit.condition}`,
            walking: `${r.walking.time} min`,
          }
        }));
      }

      return NextResponse.json(mockResponse);
    }

    // Helper to inject real OSRM commute data into any response object
    const injectRealCommuteData = (response: any) => {
      const commuteData = commuteResult.status === 'fulfilled' ? commuteResult.value : null;
      if (commuteData && commuteData.routes && commuteData.routes.length > 0) {
        response.sections.calendar_commute.destinations = commuteData.routes.map((r: any) => ({
          label: r.label,
          address: r.raw_destination || "N/A",
          raw_origin: r.raw_origin || "",
          raw_destination: r.raw_destination || "",
          travel_options: {
            driving: `${r.driving.time} min ${r.driving.condition}`,
            transit: `${r.transit.time} min ${r.transit.condition}`,
            walking: `${r.walking.time} min`,
          }
        }));
      }
      return response;
    };

    // Try AI synthesis, but gracefully fall back to mock if it fails (rate limits, etc.)
    let finalResponse;
    try {
      const { object } = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: ExitCheckResponseSchema,
        prompt: `
          You are the ExitCheck AI Orchestration Agent. 
          Analyze the following raw context and generate a 1-second readability high-contrast HUD JSON output.
          
          Raw Context:
          ${JSON.stringify(context, null, 2)}
          
          Synthesis Logic Rules:
          - IMPORTANT: For commute options, include the EXACT commute condition strings provided in the context (e.g. "To Work (3.2 mi)").
          - IMPORTANT: Pass through "raw_origin" and "raw_destination" EXACTLY as they appear in the commute context.
          - IMPORTANT: Create an array entry in 'destinations' for EACH route provided in the commute context.
          - Priority 1 (Safety/Critical): Unlocked main doors, open windows with incoming rain (< 6 hours), active high-wattage heat appliances, or phone battery < 20% without a charger.
          - Priority 2 (Commute/Schedule): Imminent meetings (< 60 min), route delays, or explicit travel mode recommendations.
          - Priority 3 (Gear & Errands): MUST include all items in custom_gear_checklist.
          - Priority 4 (Quick Actions): If the user is driving, suggest a quick action to start Tesla Climate. If they are leaving, suggest a quick action to close the garage door.
          - Output actionable directives only.
        `,
      });
      finalResponse = JSON.parse(JSON.stringify(object));
    } catch (aiError: any) {
      console.warn("AI synthesis failed, falling back to mock response:", aiError?.message || aiError);
      finalResponse = JSON.parse(JSON.stringify(MOCK_AI_RESPONSE));
      finalResponse.timestamp = new Date().toISOString();
      if (dbGear.length > 0) {
        finalResponse.sections.required_gear_checklist = dbGear;
      }
    }

    // ALWAYS overwrite with real OSRM data (AI hallucinates distances)
    injectRealCommuteData(finalResponse);

    return NextResponse.json(finalResponse);
  } catch (error: any) {
    console.error("Error in AI synthesis pipeline:", error);
    return NextResponse.json({ error: "Failed to generate ExitCheck HUD", details: error?.message || String(error) }, { status: 500 });
  }
}

