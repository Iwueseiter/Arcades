import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guestSnapshot, toSnapshot } from '@/lib/server/player';
import { findSessionPlayer, getSessionPlayer } from '@/lib/server/session';

export async function GET() {
  const player = await findSessionPlayer();
  return NextResponse.json(player ? toSnapshot(player) : guestSnapshot());
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; email?: unknown };
  const player = await getSessionPlayer();

  const data: { name?: string; email?: string } = {};
  if (typeof body.name === 'string') {
    const name = body.name.trim().replace(/\s+/g, ' ');
    if (name.length > 20) return NextResponse.json({ error: 'Name must be 20 characters or fewer' }, { status: 400 });
    if (name && !/^[\p{L}\p{N} _.-]+$/u.test(name)) {
      return NextResponse.json({ error: 'Use letters, numbers, spaces, dots, dashes or underscores' }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body.email === 'string') {
    const email = body.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
    }
    data.email = email.slice(0, 120);
  }

  const updated = await prisma.player.update({ where: { id: player.id }, data });
  return NextResponse.json(toSnapshot(updated));
}
