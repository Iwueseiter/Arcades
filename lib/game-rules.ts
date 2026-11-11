export type TokenType = 'standard' | 'golden' | 'rocket' | 'bomb';

/** Cosmetic looks for standard tokens. They all score the same; variety just makes the arena fun. */
export const STANDARD_SKINS = ['coin', 'jelly-drop', 'jelly-cube', 'bubble', 'candy'] as const;
export type Skin = (typeof STANDARD_SKINS)[number] | TokenType;

export type Token = {
  id: string;
  type: TokenType;
  skin: Skin;
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  spin: number;
};

/** One event in a round, in milliseconds since the round started. The server replays these. */
export type TapLogEntry = {
  t: number;
  kind: TokenType | 'miss';
};

export const MAX_ROUNDS_PER_DAY = 5;
export const STARTING_LIVES = 3;
export const ARENA_WIDTH = 330;
export const ARENA_HEIGHT = 440;
export const ROCKET_SLOWMO_MS = 5000;
export const BOMB_PENALTY = 15;
export const MILESTONES = [100, 250, 500, 1000, 2000, 5000] as const;

const MIN_SPAWN_INTERVAL_MS = 420;
const MAX_TOKENS_PER_SPAWN = 3;
const MAX_ROUND_MS = 30 * 60 * 1000;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDifficulty(score: number) {
  const level = Math.min(Math.floor(score / 180), 12);
  return {
    level,
    speedMultiplier: 1 + level * 0.08,
    spawnIntervalMs: Math.max(MIN_SPAWN_INTERVAL_MS, 950 - level * 45),
    bombChance: Math.min(0.3, 0.08 + level * 0.018),
    rocketChance: 0.07,
    goldenChance: 0.14,
  };
}

export function getStreakMultiplier(streak: number) {
  if (streak >= 50) return 4;
  if (streak >= 25) return 3;
  if (streak >= 10) return 2;
  return 1;
}

export function nextStreakThreshold(streak: number) {
  if (streak < 10) return 10;
  if (streak < 25) return 25;
  if (streak < 50) return 50;
  return null;
}

export function nextMilestone(score: number) {
  return MILESTONES.find((m) => m > score) ?? null;
}

/** `spawnIndex` makes every token in a round unique even when the score doesn't change between spawns. */
export function createToken(seed: number, spawnIndex: number, score: number, slot?: { n: number; count: number }): Token {
  const rng = mulberry32(seed ^ Math.imul(spawnIndex + 1, 0x9e3779b1));
  const roll = rng();
  const difficulty = getDifficulty(score);

  let type: TokenType = 'standard';
  if (roll < difficulty.bombChance) {
    type = 'bomb';
  } else if (roll < difficulty.bombChance + difficulty.rocketChance) {
    type = 'rocket';
  } else if (roll < difficulty.bombChance + difficulty.rocketChance + difficulty.goldenChance) {
    type = 'golden';
  }

  const radius = type === 'golden' ? 34 : type === 'bomb' ? 29 : 31;
  // In a cluster each token gets its own column so they never overlap.
  const column = slot ? (slot.n + 0.15 + rng() * 0.7) / slot.count : rng();
  const x = radius + column * (ARENA_WIDTH - radius * 2);
  const speed = clamp(85 + rng() * 50, 85, 135) * difficulty.speedMultiplier;

  const skin: Skin = type === 'standard' ? STANDARD_SKINS[Math.floor(rng() * STANDARD_SKINS.length)] : type;

  return {
    id: `t${spawnIndex}`,
    type,
    skin,
    x,
    y: -radius,
    radius,
    speed,
    drift: (rng() - 0.5) * 24,
    spin: (rng() - 0.5) * 120,
  };
}

/** One spawn: usually a single token, sometimes a cluster of two or three falling side by side. */
export function createSpawn(seed: number, spawnIndex: number, score: number): Token[] {
  const roll = mulberry32(seed ^ Math.imul(spawnIndex + 7, 0x85ebca6b))();
  const count = roll < 0.08 ? MAX_TOKENS_PER_SPAWN : roll < 0.3 ? 2 : 1;
  if (count === 1) return [createToken(seed, spawnIndex * MAX_TOKENS_PER_SPAWN, score)];
  return Array.from({ length: count }, (_, n) => createToken(seed, spawnIndex * MAX_TOKENS_PER_SPAWN + n, score, { n, count }));
}

/** Where a token is drawn: it sways side to side as it falls. Used for rendering and tap effects. */
export function swayX(token: Token) {
  return clamp(token.x + Math.sin(token.y / 70 + token.spin) * 16, token.radius, ARENA_WIDTH - token.radius);
}

/** Points awarded for tapping a token at the given streak (before the tap). */
export function pointsFor(kind: TokenType, streak: number) {
  const multiplier = getStreakMultiplier(streak);
  if (kind === 'standard') return 10 * multiplier;
  if (kind === 'golden') return 20 * multiplier;
  if (kind === 'bomb') return -BOMB_PENALTY;
  return 0;
}

export type ReplayResult =
  | { ok: true; score: number; hits: number; maxStreak: number; lives: number }
  | { ok: false; reason: string };

/**
 * Re-computes a round's score from its event log. Used by the server so the client can't just
 * report a number. It also rejects logs that are physically impossible for the spawn rate.
 */
export function replayRound(log: TapLogEntry[], elapsedMs: number): ReplayResult {
  if (!Array.isArray(log)) return { ok: false, reason: 'Malformed log' };
  if (elapsedMs > MAX_ROUND_MS) return { ok: false, reason: 'Round expired' };

  const maxEvents = (Math.floor(elapsedMs / MIN_SPAWN_INTERVAL_MS) + 1) * MAX_TOKENS_PER_SPAWN + 4;
  if (log.length > maxEvents) return { ok: false, reason: 'Too many events for round length' };

  let lives = STARTING_LIVES;
  let streak = 0;
  let maxStreak = 0;
  let score = 0;
  let hits = 0;
  let lastT = 0;

  for (const entry of log) {
    if (lives <= 0) return { ok: false, reason: 'Events after game over' };
    if (!entry || typeof entry.t !== 'number' || !Number.isFinite(entry.t)) return { ok: false, reason: 'Malformed event' };
    if (entry.t < lastT || entry.t > elapsedMs + 2000) return { ok: false, reason: 'Event out of order' };
    lastT = entry.t;

    switch (entry.kind) {
      case 'standard':
      case 'golden':
        score += pointsFor(entry.kind, streak);
        streak += 1;
        hits += 1;
        break;
      case 'rocket':
        streak += 1;
        hits += 1;
        break;
      case 'bomb':
        score = Math.max(0, score - BOMB_PENALTY);
        lives -= 1;
        streak = 0;
        break;
      case 'miss':
        lives -= 1;
        streak = 0;
        break;
      default:
        return { ok: false, reason: 'Unknown event' };
    }
    maxStreak = Math.max(maxStreak, streak);
  }

  return { ok: true, score, hits, maxStreak, lives };
}

export function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** ISO week key such as `2026-W46`, used for the weekly leaderboard. */
export function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Milliseconds until the next Monday 00:00 UTC, when the weekly board resets. */
export function msUntilWeekReset(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() + (8 - day));
  return next.getTime() - now.getTime();
}
