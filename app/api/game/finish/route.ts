import { NextResponse } from 'next/server';
import { botSignal, getWeekKey, replayRound, type TapLogEntry } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { toSnapshot } from '@/lib/server/player';
import { findSessionPlayer } from '@/lib/server/session';
import { weekStandings } from '@/lib/server/tournament';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { roundId?: string; log?: TapLogEntry[] };
  if (!body.roundId || !Array.isArray(body.log)) {
    return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
  }

  const player = await findSessionPlayer();
  const round = player ? await prisma.gameRound.findUnique({ where: { id: body.roundId } }) : null;
  if (!player || !round || round.playerId !== player.id) return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  if (round.finishedAt) return NextResponse.json({ error: 'Round already submitted' }, { status: 409 });

  const now = new Date();
  const replay = replayRound(body.log, now.getTime() - round.startedAt.getTime());
  const score = replay.ok ? replay.score : 0;
  const flagged = replay.ok && round.ranked ? botSignal(body.log) : null;
  if (flagged) console.warn(`[anti-cheat] round ${round.id} by ${player.id} flagged: ${flagged}`);

  const weekKey = getWeekKey(now);
  // Guard against a double submit racing past the check above.
  const claimed = await prisma.gameRound.updateMany({
    where: { id: round.id, finishedAt: null },
    data: { finishedAt: now, score, flagged, weekKey: round.ranked ? weekKey : null },
  });
  if (claimed.count === 0) return NextResponse.json({ error: 'Round already submitted' }, { status: 409 });

  const weeklyBest = player.weekKey === weekKey ? player.weeklyBest : 0;
  const newBest = score > player.bestScore;
  const counts = round.ranked && !flagged && score > 0;

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      gamesPlayed: { increment: 1 },
      totalScore: { increment: score },
      bestScore: Math.max(player.bestScore, score),
      ...(counts ? { weekKey, weeklyBest: Math.max(weeklyBest, score) } : {}),
    },
  });

  const rank = counts ? ((await weekStandings(weekKey)).find((row) => row.playerId === player.id)?.rank ?? null) : null;

  return NextResponse.json({
    score,
    ranked: round.ranked,
    rank,
    newBest,
    rejected: replay.ok ? undefined : replay.reason,
    player: toSnapshot(updated),
  });
}
