import type { Player } from '@prisma/client';
import { MAX_ROUNDS_PER_DAY, getTodayKey, getWeekKey } from '@/lib/game-rules';
import type { PlayerSnapshot } from '@/lib/types';

export const parsePurchases = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
};

export const roundsUsedToday = (player: Player) => (player.roundsDay === getTodayKey() ? player.roundsUsed : 0);

export const displayName = (player: Pick<Player, 'name' | 'address'>) =>
  player.name || (player.address ? `${player.address.slice(0, 6)}…${player.address.slice(-4)}` : 'Guest');

/** Demo streak is only alive if the last claim was today or yesterday. */
function liveDemoStreak(player: Player) {
  if (!player.demoLastClaim) return 0;
  const days = Math.round((Date.parse(getTodayKey()) - Date.parse(player.demoLastClaim)) / 86400000);
  return days <= 1 ? player.demoStreak : 0;
}

/** A visitor without a saved player yet: everything at its starting value. */
export function guestSnapshot(): PlayerSnapshot {
  const now = new Date();
  return toSnapshot({
    id: '',
    address: null,
    loginEmail: null,
    identityRoot: null,
    name: '',
    email: '',
    bestScore: 0,
    weekKey: '',
    weeklyBest: 0,
    gamesPlayed: 0,
    totalScore: 0,
    roundsDay: '',
    roundsUsed: 0,
    earnedMilli: 0,
    banned: false,
    demoBalance: 25,
    demoPurchases: '[]',
    demoLastClaim: null,
    demoStreak: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export function toSnapshot(player: Player): PlayerSnapshot {
  return {
    id: player.id,
    name: player.name,
    displayName: displayName(player),
    email: player.email,
    address: player.address,
    signedInEmail: player.loginEmail,
    bestScore: player.bestScore,
    weeklyBest: player.weekKey === getWeekKey() ? player.weeklyBest : 0,
    gamesPlayed: player.gamesPlayed,
    totalScore: player.totalScore,
    roundsLeft: Math.max(0, MAX_ROUNDS_PER_DAY - roundsUsedToday(player)),
    maxRounds: MAX_ROUNDS_PER_DAY,
    earned: player.earnedMilli / 1000,
    banned: player.banned,
    demo: {
      balance: Number(player.demoBalance.toFixed(2)),
      purchases: parsePurchases(player.demoPurchases),
      claimedToday: player.demoLastClaim === getTodayKey(),
      streak: liveDemoStreak(player),
    },
  };
}
