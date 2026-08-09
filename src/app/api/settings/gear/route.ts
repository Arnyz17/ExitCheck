import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function resolveUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  return session?.user?.id || 'usr_123';
}

export async function POST(request: Request) {
  try {
    const userId = await resolveUserId();
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const newItem = await prisma.gearItem.create({
      data: { name, userId },
    });

    return NextResponse.json(newItem);
  } catch (error) {
    console.error('Error adding gear item:', error);
    return NextResponse.json({ error: 'Failed to add gear item' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.gearItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gear item:', error);
    return NextResponse.json({ error: 'Failed to delete gear item' }, { status: 500 });
  }
}
