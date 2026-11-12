import { NextResponse } from 'next/server';
import { getTodayKey } from '@/lib/game-rules';
import { puzzleNumber } from '@/lib/merge-engine';
import { prisma } from '@/lib/prisma';
import { dailySeed, msUntilTomorrow } from '@/lib/server/merge';
import { getSessionPlayer } from '@/lib/server/session';
import type { MergeToday } from '@/lib/types';

async function rankFor(day: string, score: number) {
  return (await prisma.mergeRun.count({ where: { day, finishedAt: { not: null }, score: { gt: score } } })) + 1;
}

/** Today's puzzle and where this player stands on it. */
export async function GET() {
  const player = await getSessionPlayer();
  const day = getTodayKey();
  const run = await prisma.mergeRun.findUnique({ where: { playerId_day: { playerId: player.id, day } } });

  const today: MergeToday = {
    day,
    number: puzzleNumber(day),
    resetsInMs: msUntilTomorrow(),
    run: !run
      ? null
      : run.finishedAt
        ? { status: 'finished', runId: run.id, score: run.score ?? 0, maxTier: run.maxTier ?? 1, rank: await rankFor(day, run.score ?? 0), reward: run.rewardMilli / 1000 }
        : { status: 'active', runId: run.id, seed: run.seed },
  };
  return NextResponse.json(today);
}

/** Starts (or resumes) today's ranked attempt. One per player per day. */
export async function POST() {
  const player = await getSessionPlayer();
  const day = getTodayKey();
  const existing = await prisma.mergeRun.findUnique({ where: { playerId_day: { playerId: player.id, day } } });
  if (existing?.finishedAt) return NextResponse.json({ error: 'You already played today’s puzzle' }, { status: 409 });

  const run = existing ?? (await prisma.mergeRun.create({ data: { playerId: player.id, day, seed: dailySeed(day) } }));
  return NextResponse.json({ runId: run.id, seed: run.seed, day, number: puzzleNumber(day) });
}
