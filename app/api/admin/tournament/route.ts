import { NextResponse } from 'next/server';
import { getWeekKey } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/server/admin';
import { weekStandings } from '@/lib/server/tournament';

/**
 * Review a tournament before its prizes go out: the top players with their round counts, plus
 * every flagged round of the week. `?week=2026-W46` picks a week (default: this one).
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekKey = new URL(request.url).searchParams.get('week') ?? getWeekKey();
  const top = (await weekStandings(weekKey)).slice(0, 30);

  const counts = await prisma.gameRound.groupBy({
    by: ['playerId'],
    where: { weekKey, playerId: { in: top.map((row) => row.playerId) } },
    _count: { _all: true },
    _max: { score: true },
  });
  const flagged = await prisma.gameRound.findMany({
    where: { weekKey, flagged: { not: null } },
    orderBy: { score: 'desc' },
    take: 100,
    select: { id: true, playerId: true, score: true, flagged: true, finishedAt: true, player: { select: { address: true, name: true } } },
  });

  return NextResponse.json({
    weekKey,
    top: top.map((row) => ({ ...row, rounds: counts.find((count) => count.playerId === row.playerId)?._count._all ?? 0 })),
    flagged,
  });
}
