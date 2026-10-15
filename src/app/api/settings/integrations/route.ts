import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "usr_123";
    const { provider, status } = await request.json();

    if (typeof provider !== "string" || !["connected", "disconnected"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const integration = await prisma.integration.upsert({
      where: { userId_provider: { userId, provider } },
      update: { status },
      create: { userId, provider, status },
    });
    return NextResponse.json(integration);
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}
