import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/user";

/** Fires a user-configured webhook. Shortcut and link actions run on the device, not here. */
export async function POST(request: Request) {
  const userId = await resolveUserId();
  const { actionId } = await request.json();
  const action = await prisma.quickAction.findFirst({ where: { id: actionId, userId } });
  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  if (action.kind !== "webhook") return NextResponse.json({ error: "Not a webhook action" }, { status: 400 });

  try {
    const res = await fetch(action.target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "exitcheck", action: action.label, at: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Responded ${res.status}`);
    return NextResponse.json({ ok: true, message: `${action.label} done` });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unreachable";
    return NextResponse.json({ error: `Couldn't reach the service (${reason})` }, { status: 502 });
  }
}
