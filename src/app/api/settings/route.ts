import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper to resolve which user ID to use — real session user, or fallback to usr_123 for NFC access
async function resolveUserId(requestUserId?: string | null): Promise<string> {
  // Try getting the session user first
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  // Fallback to URL param user_id (for NFC tag access without login)
  if (requestUserId && requestUserId !== 'unknown') return requestUserId;

  return 'usr_123';
}

// Ensure the user exists in the DB (upsert)
async function ensureUserExists(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: 'ExitCheck User',
      homeAddress: '',
      gearItems: {
        create: [
          { name: 'Laptop' },
          { name: 'Access Badge' },
          { name: 'Keys' },
        ],
      },
      integrations: {
        create: [{ provider: 'google_calendar', status: 'disconnected' }],
      },
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestUserId = searchParams.get('user_id');
    const userId = await resolveUserId(requestUserId);

    await ensureUserExists(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { gearItems: true, integrations: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestUserId = searchParams.get('user_id');
    const userId = await resolveUserId(requestUserId);
    const body = await request.json();
    const { homeAddress, workAddress } = body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(homeAddress !== undefined && { homeAddress }),
        ...(workAddress !== undefined && { workAddress }),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
