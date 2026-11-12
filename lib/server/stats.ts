import { getWeekKey, weekIndexFor } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { contractTotals } from '@/lib/server/chain';

const DAY = 86400_000;

const weekStart = (weekKey: string) => new Date(weekIndexFor(weekKey) * 7 * DAY - 3 * DAY);

async function activePlayers(from: Date, to: Date) {
  const rows = await prisma.gameRound.findMany({
    where: { startedAt: { gte: from, lt: to } },
    distinct: ['playerId'],
    select: { playerId: true },
  });
  return new Set(rows.map((row) => row.playerId));
}

/** Everything on the public /stats page: on-chain totals plus weekly activity from the game server. */
export async function getStats(now = new Date()) {
  const thisWeek = getWeekKey(now);
  const lastWeek = getWeekKey(new Date(now.getTime() - 7 * DAY));
  const thisStart = weekStart(thisWeek);
  const lastStart = weekStart(lastWeek);

  const [current, previous, players, walletPlayers, verifiedPeople, gamesThisWeek, tournaments, winners, prizes, chain] =
    await Promise.all([
      activePlayers(thisStart, now),
      activePlayers(lastStart, thisStart),
      prisma.player.count({ where: { gamesPlayed: { gt: 0 } } }),
      prisma.player.count({ where: { address: { not: null } } }),
      prisma.player.findMany({ where: { identityRoot: { not: null } }, distinct: ['identityRoot'], select: { identityRoot: true } }),
      prisma.gameRound.count({ where: { startedAt: { gte: thisStart } } }),
      prisma.tournament.count(),
      prisma.tournamentPrize.findMany({ distinct: ['playerId'], select: { playerId: true } }),
      prisma.tournamentPrize.aggregate({ _sum: { amountMilli: true } }),
      contractTotals().catch(() => null),
    ]);

  const returning = [...previous].filter((id) => current.has(id)).length;

  return {
    weekKey: thisWeek,
    players,
    walletPlayers,
    verifiedPeople: verifiedPeople.length,
    activeThisWeek: current.size,
    activeLastWeek: previous.size,
    /** Share of last week's players who came back this week (null before there's a last week). */
    weeklyRetention: previous.size ? returning / previous.size : null,
    gamesThisWeek,
    tournamentsFinished: tournaments,
    tournamentWinners: winners.length,
    prizesAwarded: (prizes._sum.amountMilli ?? 0) / 1000,
    chain,
  };
}
