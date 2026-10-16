import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/user";
import { geocode } from "@/lib/mock-apis";

/** Coordinates for the places shown on the map (cached geocoding). */
export async function POST(request: Request) {
  const { user_id } = await request.json().catch(() => ({}));
  const userId = await resolveUserId(user_id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const places: { label: string; address: string; lat: number; lon: number }[] = [];
  for (const [label, address] of [["Home", user?.homeAddress], ["Work", user?.workAddress]] as const) {
    if (!address) continue;
    const hit = await geocode(address).catch(() => null);
    if (hit) places.push({ label, address, ...hit });
  }
  return NextResponse.json({ places });
}
