import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser, resolveUserId } from "@/lib/user";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(new URL(request.url).searchParams.get("user_id"));
    await ensureUser(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { gearItems: true, integrations: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await resolveUserId(new URL(request.url).searchParams.get("user_id"));
    const { homeAddress, workAddress, name } = await request.json();
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(homeAddress !== undefined && { homeAddress }),
        ...(workAddress !== undefined && { workAddress }),
        ...(name !== undefined && { name: String(name).trim().slice(0, 40) || null }),
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
