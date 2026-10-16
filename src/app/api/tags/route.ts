import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ensureUser, resolveUserId } from "@/lib/user";

export async function GET() {
  const userId = await resolveUserId();
  await ensureUser(userId);
  const tags = await prisma.nfcTag.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ userId, tags });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  await ensureUser(userId);
  const { name, location = "", icon = "door-open", items = "" } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const tag = await prisma.nfcTag.create({
    data: {
      userId,
      name: name.trim().slice(0, 40),
      location: String(location).trim().slice(0, 60),
      icon,
      items: String(items).slice(0, 300),
      tagId: randomBytes(5).toString("hex"),
    },
  });
  return NextResponse.json(tag);
}

export async function PATCH(request: Request) {
  const userId = await resolveUserId();
  const { id, name, location, icon, items } = await request.json();
  const result = await prisma.nfcTag.updateMany({
    where: { id, userId },
    data: {
      ...(typeof name === "string" && name.trim() && { name: name.trim().slice(0, 40) }),
      ...(typeof location === "string" && { location: location.trim().slice(0, 60) }),
      ...(typeof icon === "string" && { icon }),
      ...(typeof items === "string" && { items: items.slice(0, 300) }),
    },
  });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await resolveUserId();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.nfcTag.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
