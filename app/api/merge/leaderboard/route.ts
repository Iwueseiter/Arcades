import { NextResponse } from 'next/server';
import { getTodayKey } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { msUntilTomorrow } from '@/lib/server/merge';
import { displayName } from '@/lib/server/player';
import { getSessionPlayer } from '@/lib/server/session';
import type { LeaderboardResponse } from '@/lib/types';

const TOP = 20;

/** Today's Jelly Merge board: one run per player, so it's a straight sort. */
export async function GET() {
  const day = getTodayKey();
  const me = await getSessionPlayer();

  const runs = await prisma.mergeRun.findMany({
    where: { day, finishedAt: { not: null } },
    orderBy: [{ score: 'desc' }, { finishedAt: 'asc' }],
    take: TOP,
    include: { player: { select: { id: true, name: true, address: true } } },
  });

  const rows = runs.map((run, index) => ({
    rank: index + 1,
    name: displayName(run.player),
    score: run.score ?? 0,
    isYou: run.playerId === me.id,
    verifiedWallet: Boolean(run.player.address),
  }));

  let you = rows.find((row) => row.isYou) ?? null;
  if (!you) {
    const mine = await prisma.mergeRun.findUnique({ where: { playerId_day: { playerId: me.id, day } } });
    if (mine?.finishedAt) {
      const ahead = await prisma.mergeRun.count({ where: { day, finishedAt: { not: null }, score: { gt: mine.score ?? 0 } } });
      you = { rank: ahead + 1, name: displayName(me), score: mine.score ?? 0, isYou: true, verifiedWallet: Boolean(me.address) };
    }
  }

  const response: LeaderboardResponse = { weekKey: day, resetsInMs: msUntilTomorrow(), rows, you };
  return NextResponse.json(response);
}
