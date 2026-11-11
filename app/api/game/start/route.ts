import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { MAX_ROUNDS_PER_DAY, getTodayKey } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { roundsUsedToday, toSnapshot } from '@/lib/server/player';
import { getSessionPlayer } from '@/lib/server/session';

export async function POST() {
  const player = await getSessionPlayer();
  const used = roundsUsedToday(player);
  // Once the daily ranked rounds are spent, players can keep practising without rewards or ranking.
  const ranked = used < MAX_ROUNDS_PER_DAY;

  const [round, updated] = await prisma.$transaction([
    prisma.gameRound.create({ data: { playerId: player.id, seed: randomInt(1, 2 ** 31 - 1), ranked } }),
    prisma.player.update({
      where: { id: player.id },
      data: ranked ? { roundsDay: getTodayKey(), roundsUsed: used + 1 } : {},
    }),
  ]);

  return NextResponse.json({ roundId: round.id, seed: round.seed, ranked, player: toSnapshot(updated) });
}
