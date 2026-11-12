import { NextResponse } from 'next/server';
import { getWeekKey, replayRound, type TapLogEntry } from '@/lib/game-rules';
import { onChainMode } from '@/lib/chain/config';
import { prisma } from '@/lib/prisma';
import { toSnapshot } from '@/lib/server/player';
import { roundRewardMilli } from '@/lib/server/rewards';
import { getSessionPlayer } from '@/lib/server/session';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { roundId?: string; log?: TapLogEntry[] };
  if (!body.roundId || !Array.isArray(body.log)) {
    return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
  }

  const player = await getSessionPlayer();
  const round = await prisma.gameRound.findUnique({ where: { id: body.roundId } });
  if (!round || round.playerId !== player.id) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (round.finishedAt) return NextResponse.json({ error: 'Round already submitted' }, { status: 409 });

  const now = new Date();
  const replay = replayRound(body.log, now.getTime() - round.startedAt.getTime());
  const score = replay.ok ? replay.score : 0;

  // Rewards go to wallets in on-chain mode, and to everyone's demo balance otherwise.
  const rewardMilli = round.ranked && replay.ok && (player.address || !onChainMode) ? roundRewardMilli(score) : 0;

  // Guard against a double submit racing past the check above.
  const claimed = await prisma.gameRound.updateMany({
    where: { id: round.id, finishedAt: null },
    data: { finishedAt: now, score, rewardMilli },
  });
  if (claimed.count === 0) return NextResponse.json({ error: 'Round already submitted' }, { status: 409 });

  const weekKey = getWeekKey(now);
  const weeklyBest = player.weekKey === weekKey ? player.weeklyBest : 0;
  const newBest = score > player.bestScore;

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      gamesPlayed: { increment: 1 },
      totalScore: { increment: score },
      bestScore: Math.max(player.bestScore, score),
      ...(round.ranked ? { weekKey, weeklyBest: Math.max(weeklyBest, score) } : {}),
      ...(onChainMode
        ? { earnedMilli: { increment: rewardMilli } }
        : { demoBalance: { increment: rewardMilli / 1000 } }),
    },
  });

  return NextResponse.json({
    score,
    ranked: round.ranked,
    reward: rewardMilli / 1000,
    newBest,
    rejected: replay.ok ? undefined : replay.reason,
    player: toSnapshot(updated),
  });
}
