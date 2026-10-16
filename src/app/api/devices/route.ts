import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser, resolveUserId } from "@/lib/user";
import { haCheck, haSnapshot, goveeDevices } from "@/lib/devices";

export async function GET() {
  const userId = await resolveUserId();
  const rows = await prisma.deviceConnection.findMany({ where: { userId } });
  // Secrets never leave the server.
  return NextResponse.json({
    devices: rows.map((r) => ({ id: r.id, provider: r.provider, label: r.label, host: safeHost(r.config) })),
  });
}

function safeHost(config: string) {
  try {
    const c = JSON.parse(config);
    return c.url ? new URL(c.url).host : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  await ensureUser(userId);
  const { provider, url, token } = await request.json();
  if (typeof token !== "string" || !token.trim()) return NextResponse.json({ error: "Enter your access token" }, { status: 400 });

  try {
    let label = "";
    let config: Record<string, string>;
    if (provider === "home_assistant") {
      if (typeof url !== "string" || !/^https?:\/\//.test(url.trim())) {
        return NextResponse.json({ error: "Enter your Home Assistant address, like http://homeassistant.local:8123" }, { status: 400 });
      }
      config = { url: url.trim(), token: token.trim() };
      await haCheck({ url: config.url, token: config.token });
      const snap = await haSnapshot({ url: config.url, token: config.token });
      label = `${snap.total} devices found`;
    } else if (provider === "govee") {
      config = { token: token.trim() };
      const list = await goveeDevices({ token: config.token });
      label = `${list.length} device${list.length === 1 ? "" : "s"} found`;
    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
    const row = await prisma.deviceConnection.upsert({
      where: { userId_provider: { userId, provider } },
      update: { config: JSON.stringify(config), label },
      create: { userId, provider, config: JSON.stringify(config), label },
    });
    return NextResponse.json({ id: row.id, provider, label });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Couldn't connect";
    return NextResponse.json({ error: /abort|timeout|fetch failed/i.test(reason) ? "Couldn't reach it. Check the address and that this server can see your network." : reason }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const userId = await resolveUserId();
  const provider = new URL(request.url).searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "Provider required" }, { status: 400 });
  await prisma.deviceConnection.deleteMany({ where: { userId, provider } });
  return NextResponse.json({ ok: true });
}
