/**
 * Jelly Merge: slide the board, matching treats merge into the next tier.
 *
 * The engine is pure and deterministic: given a seed and a move string ("ULDR…") it always
 * produces the same board. The client plays with it and the server replays the same moves to
 * verify the score exactly.
 */

export type Dir = 'U' | 'D' | 'L' | 'R';

export const SIZE = 4;
export const MAX_MOVES = 6000;

export type MergeTile = {
  id: number;
  tier: number;
  r: number;
  c: number;
  born?: 'spawn' | 'merge';
};

export type MergeGame = {
  seed: number;
  rng: number;
  tiles: MergeTile[];
  /** Tiles consumed by the last move, positioned where they merged (for the slide-in animation). */
  ghosts: MergeTile[];
  nextId: number;
  score: number;
  maxTier: number;
  moves: string;
  over: boolean;
  lastGain: number;
};

export const TIERS = [
  { name: 'Sugar Drop', emoji: '💧' },
  { name: 'Gummy Cube', emoji: '🟩' },
  { name: 'Bubble', emoji: '🫧' },
  { name: 'Swirl Candy', emoji: '🍬' },
  { name: 'Lollipop', emoji: '🍭' },
  { name: 'Donut', emoji: '🍩' },
  { name: 'Cupcake', emoji: '🧁' },
  { name: 'G$ Coin', emoji: '🪙' },
  { name: 'Star Coin', emoji: '⭐' },
  { name: 'Crown Jelly', emoji: '👑' },
  { name: 'Rainbow Bloop', emoji: '🌈' },
] as const;

export const tierInfo = (tier: number) => TIERS[Math.min(tier, TIERS.length) - 1];

/** Points for creating a tile of this tier. */
export const tileValue = (tier: number) => 2 ** tier;

/** One step of mulberry32, returning the value and the next state so the game stays pure. */
function nextRandom(state: number): [number, number] {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

function spawn(game: MergeGame): MergeGame {
  const taken = new Set(game.tiles.map((tile) => tile.r * SIZE + tile.c));
  const empty: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) empty.push(i);
  if (!empty.length) return game;

  const [pickRoll, s1] = nextRandom(game.rng);
  const [tierRoll, s2] = nextRandom(s1);
  const cell = empty[Math.floor(pickRoll * empty.length)];
  const tile: MergeTile = { id: game.nextId, tier: tierRoll < 0.9 ? 1 : 2, r: Math.floor(cell / SIZE), c: cell % SIZE, born: 'spawn' };
  return { ...game, rng: s2, nextId: game.nextId + 1, tiles: [...game.tiles, tile] };
}

export function newGame(seed: number): MergeGame {
  const game: MergeGame = {
    seed,
    rng: seed >>> 0,
    tiles: [],
    ghosts: [],
    nextId: 1,
    score: 0,
    maxTier: 1,
    moves: '',
    over: false,
    lastGain: 0,
  };
  return spawn(spawn(game));
}

/** Board cells along one line, ordered in the direction tiles slide toward. */
function line(dir: Dir, index: number) {
  return Array.from({ length: SIZE }, (_, k) => {
    switch (dir) {
      case 'L':
        return { r: index, c: k };
      case 'R':
        return { r: index, c: SIZE - 1 - k };
      case 'U':
        return { r: k, c: index };
      case 'D':
        return { r: SIZE - 1 - k, c: index };
    }
  });
}

export function canMove(game: Pick<MergeGame, 'tiles'>) {
  if (game.tiles.length < SIZE * SIZE) return true;
  const grid = new Map(game.tiles.map((tile) => [tile.r * SIZE + tile.c, tile.tier]));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tier = grid.get(r * SIZE + c);
      if (c + 1 < SIZE && grid.get(r * SIZE + c + 1) === tier) return true;
      if (r + 1 < SIZE && grid.get((r + 1) * SIZE + c) === tier) return true;
    }
  }
  return false;
}

/** Applies a swipe. Returns null when nothing would move (which doesn't count as a move). */
export function move(game: MergeGame, dir: Dir): MergeGame | null {
  if (game.over) return null;
  const at = new Map(game.tiles.map((tile) => [tile.r * SIZE + tile.c, tile]));
  const tiles: MergeTile[] = [];
  const ghosts: MergeTile[] = [];
  let nextId = game.nextId;
  let gain = 0;
  let maxTier = game.maxTier;
  let moved = false;

  for (let i = 0; i < SIZE; i++) {
    const cells = line(dir, i);
    const items = cells.map((cell) => at.get(cell.r * SIZE + cell.c)).filter((tile): tile is MergeTile => Boolean(tile));
    let slot = 0;
    for (let k = 0; k < items.length; k++) {
      const target = cells[slot];
      const current = items[k];
      const following = items[k + 1];
      if (following && following.tier === current.tier) {
        const tier = current.tier + 1;
        ghosts.push({ ...current, r: target.r, c: target.c, born: undefined }, { ...following, r: target.r, c: target.c, born: undefined });
        tiles.push({ id: nextId++, tier, r: target.r, c: target.c, born: 'merge' });
        gain += tileValue(tier);
        maxTier = Math.max(maxTier, tier);
        moved = true;
        k += 1;
      } else {
        if (current.r !== target.r || current.c !== target.c) moved = true;
        tiles.push({ ...current, r: target.r, c: target.c, born: undefined });
      }
      slot += 1;
    }
  }

  if (!moved) return null;
  const next = spawn({ ...game, tiles, ghosts, nextId, score: game.score + gain, lastGain: gain, maxTier, moves: game.moves + dir });
  return { ...next, over: !canMove(next) };
}

export type ReplayResult = { ok: true; score: number; maxTier: number; over: boolean; game: MergeGame } | { ok: false; reason: string };

/** Re-plays a move string from the seed. Used by the server to verify a run. */
export function replay(seed: number, moves: string): ReplayResult {
  if (moves.length > MAX_MOVES || !/^[UDLR]*$/.test(moves)) return { ok: false, reason: 'Malformed moves' };
  let game = newGame(seed);
  for (const dir of moves as Iterable<Dir>) {
    const next = move(game, dir);
    if (!next) return { ok: false, reason: 'Move had no effect' };
    game = next;
  }
  return { ok: true, score: game.score, maxTier: game.maxTier, over: game.over, game };
}

const LAUNCH_DAY = Date.UTC(2026, 10, 1);

/** Puzzle number for a UTC day key, Wordle-style. */
export function puzzleNumber(day: string) {
  return Math.floor((Date.parse(day) - LAUNCH_DAY) / 86400000) + 1;
}

/** The final board as emoji rows, for the share card. */
export function boardEmoji(tiles: MergeTile[]) {
  const grid = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill('▫️'));
  for (const tile of tiles) grid[tile.r][tile.c] = tierInfo(tile.tier).emoji;
  return grid.map((row) => row.join('')).join('\n');
}
