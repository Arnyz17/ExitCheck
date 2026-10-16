import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Signed-in user wins; otherwise the id carried by the NFC link; otherwise the demo user. */
export async function resolveUserId(requestUserId?: string | null): Promise<string> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;
  if (requestUserId && requestUserId !== "unknown") return requestUserId;
  return "usr_123";
}

export async function ensureUser(userId: string) {
  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      homeAddress: "",
      gearItems: { create: [{ name: "Keys" }, { name: "Wallet" }, { name: "Phone" }] },
      integrations: { create: [{ provider: "google_calendar", status: "disconnected" }] },
    },
  });
}
