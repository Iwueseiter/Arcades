import { NextResponse } from 'next/server';
import { tournamentsEnabled } from '@/lib/chain/config';
import { getWeekKey, msUntilWeekReset } from '@/lib/game-rules';
import { findSessionPlayer } from '@/lib/server/session';
import { lastTournament, settleDueTournaments, weekPrizes, weekStandings } from '@/lib/server/tournament';
import type { LeaderboardResponse } from '@/lib/types';

const TOP = 20;
const SETTLE_CHECK_MS = 5 * 60_000;
let lastSettleCheck = 0;

export async function GET() {
  // The cron job settles tournaments too; this just makes sure prizes go out even without it.
  if (tournamentsEnabled && Date.now() - lastSettleCheck > SETTLE_CHECK_MS) {
    lastSettleCheck = Date.now();
    await settleDueTournaments().catch((error) => console.error('[tournament] settle failed', error));
  }

  const weekKey = getWeekKey();
  const [me, standings, last, pot] = await Promise.all([
    findSessionPlayer(),
    weekStandings(weekKey),
    tournamentsEnabled ? lastTournament() : null,
    tournamentsEnabled ? weekPrizes(weekKey).catch(() => null) : null,
  ]);

  const toRow = (row: (typeof standings)[number]) => ({
    rank: row.rank,
    name: row.name,
    score: row.score,
    isYou: row.playerId === me?.id,
    verifiedWallet: Boolean(row.address),
  });

  const rows = standings.slice(0, TOP).map(toRow);
  const mine = me ? standings.find((row) => row.playerId === me.id) : undefined;

  const response: LeaderboardResponse = {
    weekKey,
    resetsInMs: msUntilWeekReset(),
    prizes: pot?.prizes ?? [],
    pot: { total: pot ? pot.baseTotal + pot.boost : 0, boosted: pot?.boost ?? 0 },
    rows,
    you: mine ? toRow(mine) : null,
    lastWeek: last && {
      weekKey: last.weekKey,
      winners: last.winners.map(({ playerId, ...winner }) => ({ ...winner, isYou: playerId === me?.id })),
    },
  };
  return NextResponse.json(response);
}
