import { NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { chainConfig } from '@/lib/chain/config';
import { prisma } from '@/lib/prisma';
import { syncArcadeEvents } from '@/lib/server/arcade-indexer';

const CLAIM_EVENTS = ['DailyClaimed', 'RewardsClaimed', 'ReferralPaid'];

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const requestedDays = Number(search.get('days'));
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let chainIndex: Awaited<ReturnType<typeof syncArcadeEvents>> | { status: 'error'; message: string } | { status: 'not-requested' };
  if (search.get('sync') === '0') {
    chainIndex = { status: 'not-requested' };
  } else {
    try {
      chainIndex = await syncArcadeEvents();
    } catch (error) {
      console.error('Arcade contract event indexing failed', error);
      chainIndex = {
        status: 'error',
        message: 'Check the RPC endpoint, contract address and deployment block configuration.',
      };
    }
  }

  const [totalPlayers, playersEverPlayed, activePlayerIds, newPlayers, rounds, pageViews, visitorGroups, pageViewTrend, playerTrend, roundTrend] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { gamesPlayed: { gt: 0 } } }),
    prisma.gameRound.groupBy({
      by: ['playerId'],
      where: { startedAt: { gte: since } },
    }),
    prisma.player.count({ where: { createdAt: { gte: since } } }),
    prisma.gameRound.count({ where: { startedAt: { gte: since } } }),
    prisma.analyticsPageView.count({ where: { createdAt: { gte: since } } }),
    prisma.analyticsPageView.groupBy({
      by: ['visitorId'],
      where: { createdAt: { gte: since } },
    }),
    prisma.$queryRaw<{ day: string | Date; count: bigint }[]>`
      SELECT DATE("createdAt") AS "day", COUNT(*) AS "count"
      FROM "AnalyticsPageView"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
    `,
    prisma.$queryRaw<{ day: string | Date; count: bigint }[]>`
      SELECT DATE("createdAt") AS "day", COUNT(*) AS "count"
      FROM "Player"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
    `,
    prisma.$queryRaw<{ day: string | Date; count: bigint }[]>`
      SELECT DATE("startedAt") AS "day", COUNT(*) AS "count"
      FROM "GameRound"
      WHERE "startedAt" >= ${since}
      GROUP BY DATE("startedAt")
    `,
  ]);

  let transactions: number | null = null;
  let gDollarPaid: string | null = null;
  if (chainConfig.arcadeAddress) {
    const contractAddress = chainConfig.arcadeAddress.toLowerCase();
    const [transactionCount, payoutEvents] = await Promise.all([
      prisma.arcadeContractTransaction.count({
        where: { chainId: chainConfig.chain.id, contractAddress },
      }),
      prisma.arcadeContractEvent.findMany({
        where: {
          chainId: chainConfig.chain.id,
          contractAddress,
          eventName: { in: CLAIM_EVENTS },
          amount: { not: null },
        },
        select: { amount: true },
      }),
    ]);
    const claimedBaseUnits = payoutEvents.reduce((total, event) => total + BigInt(event.amount ?? '0'), 0n);
    transactions = transactionCount;
    gDollarPaid = formatUnits(claimedBaseUnits, chainConfig.tokenDecimals);
  }

  const dateKey = (value: string | Date) => (value instanceof Date ? value.toISOString() : value).slice(0, 10);
  const pageViewsByDay = new Map(pageViewTrend.map((row) => [dateKey(row.day), Number(row.count)]));
  const newPlayersByDay = new Map(playerTrend.map((row) => [dateKey(row.day), Number(row.count)]));
  const roundsByDay = new Map(roundTrend.map((row) => [dateKey(row.day), Number(row.count)]));
  const today = new Date();
  const trend = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + index + 1));
    const day = date.toISOString().slice(0, 10);
    return {
      day,
      pageViews: pageViewsByDay.get(day) ?? 0,
      newPlayers: newPlayersByDay.get(day) ?? 0,
      rounds: roundsByDay.get(day) ?? 0,
    };
  });

  return NextResponse.json(
    {
      periodDays: days,
      since: since.toISOString(),
      players: totalPlayers,
      playersEverPlayed,
      activeUsers: activePlayerIds.length,
      newPlayers,
      rounds,
      pageViews,
      uniqueVisitors: visitorGroups.length,
      trend,
      arcadeTransactions: transactions,
      gDollarPaid,
      chainIndex,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
