import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser, resolveUserId } from "@/lib/user";

const KINDS = ["webhook", "shortcut", "link"];

export async function GET() {
  const userId = await resolveUserId();
  await ensureUser(userId);
  const actions = await prisma.quickAction.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ actions });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  await ensureUser(userId);
  const { label, kind, target, icon = "power" } = await request.json();
  if (typeof label !== "string" || !label.trim() || !KINDS.includes(kind) || typeof target !== "string" || !target.trim()) {
    return NextResponse.json({ error: "Name, type and target are required" }, { status: 400 });
  }
  if (kind === "webhook" || kind === "link") {
    try {
      const u = new URL(target.trim());
      if (!/^https?:$/.test(u.protocol) && kind === "webhook") throw new Error();
    } catch {
      return NextResponse.json({ error: "Enter a valid URL" }, { status: 400 });
    }
  }
  const action = await prisma.quickAction.create({
    data: { userId, label: label.trim().slice(0, 30), kind, target: target.trim(), icon },
  });
  return NextResponse.json(action);
}

export async function DELETE(request: Request) {
  const userId = await resolveUserId();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.quickAction.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
