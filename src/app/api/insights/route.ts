import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUserId } from "@/lib/user";
import { parseSources, summarize } from "@/lib/insights";

export async function GET() {
  const userId = await resolveUserId();
  const logs = await prisma.scanLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 200 });
  const latest = logs[0];
  return NextResponse.json({
    summary: summarize(logs),
    recent: logs.slice(0, 20).map((l) => ({
      at: l.createdAt,
      tag: l.tagName,
      totalMs: l.totalMs,
      readiness: l.readiness,
      alerts: l.alertCount,
      aiUsed: l.aiUsed,
    })),
    latest: latest
      ? {
          at: latest.createdAt,
          tag: latest.tagName,
          totalMs: latest.totalMs,
          aiUsed: latest.aiUsed,
          aiMs: latest.aiMs,
          aiError: latest.aiError,
          sources: parseSources(latest.sources),
        }
      : null,
  });
}
