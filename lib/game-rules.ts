export type TokenType = 'standard' | 'golden' | 'rocket' | 'bomb';

export type Token = {
  id: string;
  type: TokenType;
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
};

export type TapLogEntry = {
  time: number;
  tokenId: string;
  result: 'hit' | 'miss' | 'bomb' | 'rocket';
  points: number;
  streak: number;
  score: number;
};

export const MAX_ROUNDS_PER_DAY = 5;
export const ARENA_WIDTH = 330;
export const ARENA_HEIGHT = 440;

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
    speedMultiplier: 1 + level * 0.08,
    spawnIntervalMs: Math.max(540, 1700 - level * 95),
    bombChance: Math.min(0.32, 0.08 + level * 0.016),
    rocketChance: 0.18,
  };
}

export function getStreakMultiplier(streak: number) {
  if (streak >= 50) return 4;
  if (streak >= 25) return 3;
  if (streak >= 10) return 2;
  return 1;
}

export function createToken(seed: number, score: number, id: string): Token {
  const rng = mulberry32(seed + id.length * 97 + score * 13);
  const roll = rng();
  const difficulty = getDifficulty(score);
  const bombChance = difficulty.bombChance;
  const rocketChance = difficulty.rocketChance;
  const goldenChance = 0.16;

  let type: TokenType = 'standard';
  if (roll < bombChance) {
    type = 'bomb';
  } else if (roll < bombChance + rocketChance) {
    type = 'rocket';
  } else if (roll < bombChance + rocketChance + goldenChance) {
    type = 'golden';
  }

  const radius = type === 'bomb' ? 18 : type === 'golden' ? 22 : type === 'rocket' ? 20 : 18;
  const x = 16 + rng() * (ARENA_WIDTH - 32);
  const speed = clamp(120 + score * 0.2 + rng() * 70, 120, 340) * difficulty.speedMultiplier;

  return {
    id,
    type,
    x,
    y: -radius,
    radius,
    speed,
    rotation: rng() * Math.PI * 2,
  };
}

export function getMilestoneStep(score: number) {
  const thresholds = [100, 250, 500, 1000, 2000, 5000];
  for (let i = thresholds.length - 1; i >= 0; i -= 1) {
    if (score >= thresholds[i]) {
      return thresholds[i];
    }
  }
  return 100;
}
