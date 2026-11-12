import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { lastTournament, settleDueTournaments, tournamentPrizes, weekPrizes, weekStandings } from '@/lib/server/tournament';

// Needs a Postgres database: DATABASE_URL pointing at a throwaway DB (see .github/workflows/ci.yml).
const PAST_WEEK = '2026-W40';
const NOW = new Date('2026-11-12T12:00:00Z');

async function reset() {
  await prisma.potBoost.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.gameRound.deleteMany();
  await prisma.player.deleteMany();
}

async function playerWithRounds(
  name: string,
  scores: number[],
  extra: { identityRoot?: string; banned?: boolean; flagged?: string; weekKey?: string } = {},
) {
  const player = await prisma.player.create({
    data: { name, address: `0x${name.padEnd(40, '0')}`, identityRoot: extra.identityRoot, banned: extra.banned ?? false },
  });
  for (const score of scores) {
    await prisma.gameRound.create({
      data: {
        playerId: player.id,
        seed: 1,
        ranked: true,
        score,
        finishedAt: new Date('2026-10-01T12:00:00Z'),
        weekKey: extra.weekKey ?? PAST_WEEK,
        flagged: extra.flagged ?? null,
      },
    });
  }
  return player;
}

describe('tournaments', () => {
  beforeEach(reset);
  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  it('ranks each person by their best clean round', async () => {
    await playerWithRounds('a', [100, 900]);
    await playerWithRounds('b', [500]);
    await playerWithRounds('c', [5000], { flagged: 'perfectly even timing' });
    await playerWithRounds('d', [4000], { banned: true });
    // Two wallets, one GoodDollar identity: only the better one counts.
    await playerWithRounds('e1', [700], { identityRoot: '0xroot' });
    await playerWithRounds('e2', [800], { identityRoot: '0xroot' });

    const standings = await weekStandings(PAST_WEEK);
    expect(standings.map((row) => [row.name, row.score])).toEqual([
      ['a', 900],
      ['e2', 800],
      ['b', 500],
    ]);
  });

  it('pays each finished week once, after the review window', async () => {
    const winner = await playerWithRounds('a', [900]);
    const second = await playerWithRounds('b', [500]);
    // This week's rounds are still open and must not be settled.
    await playerWithRounds('c', [9999], { weekKey: '2026-W46' });

    expect(await settleDueTournaments(NOW)).toEqual([PAST_WEEK]);
    expect(await settleDueTournaments(NOW)).toEqual([]);

    const [first, runnerUp] = tournamentPrizes();
    const after = await prisma.player.findMany({ where: { id: { in: [winner.id, second.id] } }, orderBy: { name: 'asc' } });
    // Demo mode (no arcade address in tests) credits the demo balance; on-chain mode credits earnedMilli.
    expect(after.map((player) => player.demoBalance - 25)).toEqual([first, runnerUp]);

    const last = await lastTournament();
    expect(last?.weekKey).toBe(PAST_WEEK);
    expect(last?.winners.map((row) => row.rank)).toEqual([1, 2]);
  });

  it('grows every prize in proportion to the boosts', async () => {
    const booster = await playerWithRounds('z', []);
    const base = tournamentPrizes();
    const baseTotal = base.reduce((sum, prize) => sum + prize, 0);
    // Boost the pot by half its size: every prize grows by half.
    await prisma.potBoost.create({ data: { weekKey: PAST_WEEK, playerId: booster.id, amountMilli: (baseTotal / 2) * 1000 } });

    const { prizes, boost } = await weekPrizes(PAST_WEEK);
    expect(boost).toBe(baseTotal / 2);
    expect(prizes).toEqual(base.map((prize) => prize * 1.5));

    const winner = await playerWithRounds('a', [900]);
    await settleDueTournaments(NOW);
    const after = await prisma.player.findUniqueOrThrow({ where: { id: winner.id } });
    expect(after.demoBalance - 25).toBe(base[0] * 1.5);
  });

  it('waits for the review window before paying last week', async () => {
    await playerWithRounds('a', [900], { weekKey: '2026-W45' });
    // Monday 10:00 UTC: week 45 just ended but its 24h review window is still open.
    expect(await settleDueTournaments(new Date('2026-11-09T10:00:00Z'))).toEqual([]);
    expect(await settleDueTournaments(new Date('2026-11-10T01:00:00Z'))).toEqual(['2026-W45']);
  });
});
