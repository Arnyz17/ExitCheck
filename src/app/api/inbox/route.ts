import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser, resolveUserId } from "@/lib/user";

const KINDS = ["reply", "watch"];

export async function GET(request: Request) {
  const userId = await resolveUserId(new URL(request.url).searchParams.get("user_id"));
  await ensureUser(userId);
  const items = await prisma.reminder.findMany({ where: { userId, done: false }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  await ensureUser(userId);
  const { kind, title, note = "", href = "" } = await request.json();
  if (!KINDS.includes(kind) || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const item = await prisma.reminder.create({
    data: { userId, kind, title: title.trim().slice(0, 60), note: String(note).trim().slice(0, 120), href: String(href).trim().slice(0, 300) },
  });
  return NextResponse.json(item);
}

export async function PATCH(request: Request) {
  const userId = await resolveUserId();
  const { id } = await request.json();
  await prisma.reminder.updateMany({ where: { id, userId }, data: { done: true } });
  return NextResponse.json({ ok: true });
}
