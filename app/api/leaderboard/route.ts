import { NextResponse } from 'next/server';
import { getWeekKey, msUntilWeekReset } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { displayName } from '@/lib/server/player';
import { getSessionPlayer } from '@/lib/server/session';
import type { LeaderboardResponse } from '@/lib/types';

const TOP = 20;

export async function GET() {
  const weekKey = getWeekKey();
  const me = await getSessionPlayer();

  const top = await prisma.player.findMany({
    where: { weekKey, weeklyBest: { gt: 0 } },
    orderBy: [{ weeklyBest: 'desc' }, { updatedAt: 'asc' }],
    take: TOP,
    select: { id: true, name: true, address: true, weeklyBest: true },
  });

  const rows = top.map((player, index) => ({
    rank: index + 1,
    name: displayName(player),
    score: player.weeklyBest,
    isYou: player.id === me.id,
    verifiedWallet: Boolean(player.address),
  }));

  let you = rows.find((row) => row.isYou) ?? null;
  if (!you && me.weekKey === weekKey && me.weeklyBest > 0) {
    const ahead = await prisma.player.count({ where: { weekKey, weeklyBest: { gt: me.weeklyBest } } });
    you = { rank: ahead + 1, name: displayName(me), score: me.weeklyBest, isYou: true, verifiedWallet: Boolean(me.address) };
  }

  const response: LeaderboardResponse = { weekKey, resetsInMs: msUntilWeekReset(), rows, you };
  return NextResponse.json(response);
}
