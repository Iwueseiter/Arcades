import { NextResponse } from 'next/server';
import { onChainMode } from '@/lib/chain/config';
import { replay } from '@/lib/merge-engine';
import { prisma } from '@/lib/prisma';
import { toSnapshot } from '@/lib/server/player';
import { mergeRewardMilli } from '@/lib/server/rewards';
import { getSessionPlayer } from '@/lib/server/session';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { runId?: string; moves?: string };
  if (!body.runId || typeof body.moves !== 'string') return NextResponse.json({ error: 'Invalid run' }, { status: 400 });

  const player = await getSessionPlayer();
  const run = await prisma.mergeRun.findUnique({ where: { id: body.runId } });
  if (!run || run.playerId !== player.id) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  if (run.finishedAt) return NextResponse.json({ error: 'Run already submitted' }, { status: 409 });

  // The score is whatever the moves produce when replayed from the seed; the client never reports it.
  const result = replay(run.seed, body.moves);
  if (!result.ok) return NextResponse.json({ error: `Run rejected: ${result.reason}` }, { status: 400 });

  // Rewards go to wallets in on-chain mode, and to everyone's demo balance otherwise.
  const rewardMilli = player.address || !onChainMode ? mergeRewardMilli(result.score) : 0;

  const claimed = await prisma.mergeRun.updateMany({
    where: { id: run.id, finishedAt: null },
    data: { finishedAt: new Date(), score: result.score, maxTier: result.maxTier, rewardMilli },
  });
  if (claimed.count === 0) return NextResponse.json({ error: 'Run already submitted' }, { status: 409 });

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: onChainMode ? { earnedMilli: { increment: rewardMilli } } : { demoBalance: { increment: rewardMilli / 1000 } },
  });
  const rank = (await prisma.mergeRun.count({ where: { day: run.day, finishedAt: { not: null }, score: { gt: result.score } } })) + 1;

  return NextResponse.json({ score: result.score, maxTier: result.maxTier, reward: rewardMilli / 1000, rank, player: toSnapshot(updated) });
}
