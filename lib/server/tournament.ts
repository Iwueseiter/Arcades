import { Prisma } from '@prisma/client';
import { onChainMode } from '@/lib/chain/config';
import { getWeekKey, weekIndexFor } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { boostedOnChain } from '@/lib/server/chain';
import { displayName } from '@/lib/server/player';

const DEFAULT_PRIZES = '50,30,20,10,10,5,5,5,5,5';
// Rounds read per standings query. Each person's best round is near the top, so this covers far
// more people than the prize places.
const STANDINGS_SCAN = 5000;

/** G$ for each place, first place first. Set with XURRI_TOURNAMENT_PRIZES, e.g. "50,30,20". */
export function tournamentPrizes(): number[] {
  const prizes = (process.env.XURRI_TOURNAMENT_PRIZES ?? DEFAULT_PRIZES)
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  return prizes.length ? prizes : DEFAULT_PRIZES.split(',').map(Number);
}

/** G$ added to a week's pot by players and sponsors: on-chain boosts, or play-money boosts in demo mode. */
const boostCache = new Map<string, { value: number; at: number }>();

export async function weekBoost(weekKey: string) {
  if (onChainMode) {
    // The leaderboard asks often; a pot a few seconds old is fine there. Settlement always reads fresh.
    const cached = boostCache.get(weekKey);
    if (cached && Date.now() - cached.at < 15_000 && weekKey === getWeekKey()) return cached.value;
    const value = await boostedOnChain(weekIndexFor(weekKey));
    boostCache.set(weekKey, { value, at: Date.now() });
    return value;
  }
  const total = await prisma.potBoost.aggregate({ where: { weekKey }, _sum: { amountMilli: true } });
  return (total._sum.amountMilli ?? 0) / 1000;
}

/**
 * A week's prizes per place. Boosts raise every place in proportion: if the pot grows by half, each
 * prize grows by half.
 */
export async function weekPrizes(weekKey: string) {
  const base = tournamentPrizes();
  const baseTotal = base.reduce((sum, prize) => sum + prize, 0);
  const boost = await weekBoost(weekKey);
  const scale = (baseTotal + boost) / baseTotal;
  return { prizes: base.map((prize) => Math.floor(prize * scale * 1000) / 1000), boost, baseTotal };
}

/** Hours after a week ends before its prizes go out, so cheaters can be banned first. */
const reviewMs = () => {
  const hours = Number(process.env.XURRI_TOURNAMENT_REVIEW_HOURS);
  return (Number.isFinite(hours) && hours >= 0 ? hours : 24) * 3600_000;
};

export type Standing = {
  rank: number;
  playerId: string;
  name: string;
  address: string | null;
  score: number;
  finishedAt: Date;
};

/**
 * A week's ranking: each person's best clean tournament round. Banned players and flagged rounds
 * don't count, and wallets that share a GoodDollar identity count as one person.
 */
export async function weekStandings(weekKey: string): Promise<Standing[]> {
  const rounds = await prisma.gameRound.findMany({
    where: { weekKey, ranked: true, flagged: null, score: { gt: 0 }, player: { banned: false } },
    orderBy: [{ score: 'desc' }, { finishedAt: 'asc' }],
    take: STANDINGS_SCAN,
    select: {
      score: true,
      finishedAt: true,
      player: { select: { id: true, name: true, address: true, identityRoot: true } },
    },
  });

  const seen = new Set<string>();
  const standings: Standing[] = [];
  for (const round of rounds) {
    const person = round.player.identityRoot ?? round.player.id;
    if (seen.has(person)) continue;
    seen.add(person);
    standings.push({
      rank: standings.length + 1,
      playerId: round.player.id,
      name: displayName(round.player),
      address: round.player.address,
      score: round.score ?? 0,
      finishedAt: round.finishedAt ?? new Date(0),
    });
  }
  return standings;
}

/** Hands out one week's prizes. Safe to call twice: the Tournament row can only be created once. */
async function settleWeek(weekKey: string) {
  const { prizes } = await weekPrizes(weekKey);
  const winners = (await weekStandings(weekKey)).slice(0, prizes.length);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.tournament.create({ data: { weekKey } });
      for (const winner of winners) {
        const amountMilli = Math.round(prizes[winner.rank - 1] * 1000);
        await tx.tournamentPrize.create({
          data: { weekKey, playerId: winner.playerId, rank: winner.rank, score: winner.score, amountMilli },
        });
        await tx.player.update({
          where: { id: winner.playerId },
          data: onChainMode ? { earnedMilli: { increment: amountMilli } } : { demoBalance: { increment: amountMilli / 1000 } },
        });
      }
    });
    console.info(`[tournament] settled ${weekKey}: ${winners.length} winners`);
  } catch (error) {
    // Another request settled it first.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
    throw error;
  }
}

/** Settles every finished week whose review window has passed. Cheap when there's nothing to do. */
export async function settleDueTournaments(now = new Date()) {
  const lastDue = getWeekKey(new Date(now.getTime() - reviewMs()));
  const [played, settled] = await Promise.all([
    prisma.gameRound.findMany({ where: { weekKey: { lt: lastDue } }, distinct: ['weekKey'], select: { weekKey: true } }),
    prisma.tournament.findMany({ select: { weekKey: true } }),
  ]);
  const done = new Set(settled.map((row) => row.weekKey));
  // ISO week keys sort in time order, so settle oldest first.
  const due = played.map((row) => row.weekKey!).filter((week) => !done.has(week)).sort();
  for (const week of due) await settleWeek(week);
  return due;
}

/** The most recent settled tournament, for the "last week's winners" card. */
export async function lastTournament() {
  const tournament = await prisma.tournament.findFirst({
    orderBy: { weekKey: 'desc' },
    include: {
      prizes: { orderBy: { rank: 'asc' }, include: { player: { select: { id: true, name: true, address: true } } } },
    },
  });
  if (!tournament) return null;
  return {
    weekKey: tournament.weekKey,
    winners: tournament.prizes.map((prize) => ({
      rank: prize.rank,
      playerId: prize.player.id,
      name: displayName(prize.player),
      score: prize.score,
      prize: prize.amountMilli / 1000,
    })),
  };
}
