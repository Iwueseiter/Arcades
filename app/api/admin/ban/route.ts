import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/server/admin';

/** Ban or unban a player: `{ "playerId": "...", "banned": true }`. Banned players can't win or collect prizes. */
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { playerId?: unknown; banned?: unknown };
  if (typeof body.playerId !== 'string' || typeof body.banned !== 'boolean') {
    return NextResponse.json({ error: 'Send { playerId, banned }' }, { status: 400 });
  }

  const player = await prisma.player.update({ where: { id: body.playerId }, data: { banned: body.banned } }).catch(() => null);
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  console.warn(`[admin] player ${player.id} (${player.address ?? 'guest'}) banned=${player.banned}`);
  return NextResponse.json({ id: player.id, address: player.address, banned: player.banned });
}
