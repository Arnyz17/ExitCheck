import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser, resolveUserId } from "@/lib/user";

const KINDS = ["reply", "watch"];

/** Small square photos only, stored inline. */
function cleanAvatar(v: unknown) {
  return typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length < 60_000 ? v : "";
}

export async function GET(request: Request) {
  const userId = await resolveUserId(new URL(request.url).searchParams.get("user_id"));
  await ensureUser(userId);
  const items = await prisma.reminder.findMany({ where: { userId, done: false }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  await ensureUser(userId);
  const { kind, title, note = "", href = "", avatar = "" } = await request.json();
  if (!KINDS.includes(kind) || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const item = await prisma.reminder.create({
    data: { userId, kind, title: title.trim().slice(0, 60), note: String(note).trim().slice(0, 120), href: String(href).trim().slice(0, 300), avatar: cleanAvatar(avatar) },
  });
  return NextResponse.json(item);
}

export async function PATCH(request: Request) {
  const userId = await resolveUserId();
  const { id, avatar } = await request.json();
  await prisma.reminder.updateMany({
    where: { id, userId },
    data: avatar !== undefined ? { avatar: cleanAvatar(avatar) } : { done: true },
  });
  return NextResponse.json({ ok: true });
}
