import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/user";
import { fetchGoogleCalendar, geocode, drivingMinutes } from "@/lib/mock-apis";
import { turnBack } from "@/lib/turnback";

export async function POST(request: Request) {
  try {
    const { latitude, longitude, user_id } = await request.json();
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "Location is needed to work this out." }, { status: 400 });
    }
    const userId = await resolveUserId(user_id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.homeAddress) return NextResponse.json({ error: "Add your home address in You first." }, { status: 400 });

    const home = await geocode(user.homeAddress);
    if (!home) return NextResponse.json({ error: "Couldn't find your home address on the map." }, { status: 422 });

    // Destination: the calendar event's place is not reliable, so use the saved work address.
    const dest = user.workAddress ? await geocode(user.workAddress) : null;
    const cal = (await fetchGoogleCalendar(userId)) as { start_iso?: string | null };
    const start = cal?.start_iso ? new Date(cal.start_iso).getTime() : null;
    const minutesLeft = start ? (start - Date.now()) / 60000 : null;

    const cur = { lat: latitude, lon: longitude };
    const curToHome = await drivingMinutes(cur, home);
    if (!dest) {
      return NextResponse.json({
        extraMinutes: null,
        verdict: "no_deadline",
        message: `Home is about ${curToHome} min back. Add a work address in You for a full answer.`,
        curToHome,
      });
    }
    const [homeToDest, curToDest] = await Promise.all([drivingMinutes(home, dest), drivingMinutes(cur, dest)]);
    return NextResponse.json({ ...turnBack({ curToHome, homeToDest, curToDest, minutesLeft }), curToHome, homeToDest, curToDest });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't work that out." }, { status: 500 });
  }
}
