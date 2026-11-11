import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { playSound } from '@/lib/audioManager';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  MILESTONES,
  ROCKET_SLOWMO_MS,
  STARTING_LIVES,
  type TapLogEntry,
  type Skin,
  type Token,
  type TokenType,
  clamp,
  createSpawn,
  getDifficulty,
  getStreakMultiplier,
  pointsFor,
  swayX,
} from '@/lib/game-rules';
import { usePlayerStore } from '@/lib/player-store';
import { vibrate } from '@/lib/settings-store';
import type { RoundFinishResponse } from '@/lib/types';

export type RoundStatus = 'idle' | 'starting' | 'countdown' | 'playing' | 'submitting' | 'ended';

export type Pop = { id: number; x: number; y: number; label: string; kind: TokenType | 'miss'; skin?: Skin; size?: number };

type RoundResult = RoundFinishResponse & { rejected?: string; offline?: boolean };

type GameState = {
  status: RoundStatus;
  roundId: string | null;
  ranked: boolean;
  seed: number;
  countdown: number;
  startedAt: number;
  score: number;
  lives: number;
  streak: number;
  bestStreak: number;
  multiplier: number;
  tokens: Token[];
  spawnIndex: number;
  spawnAccumulator: number;
  slowmoUntil: number;
  log: TapLogEntry[];
  pops: Pop[];
  shake: number;
  banner: string | null;
  result: RoundResult | null;
  localBest: number;
};

type GameActions = {
  startRound: () => Promise<void>;
  tick: (deltaMs: number, now: number) => void;
  tapToken: (tokenId: string) => void;
  reset: () => void;
};

const POP_LIFETIME_MS = 750;

const roundDefaults = {
  score: 0,
  lives: STARTING_LIVES,
  streak: 0,
  bestStreak: 0,
  multiplier: 1,
  tokens: [] as Token[],
  spawnIndex: 0,
  spawnAccumulator: 0,
  slowmoUntil: 0,
  log: [] as TapLogEntry[],
  pops: [] as Pop[],
  shake: 0,
  banner: null,
  result: null,
};

const milestoneLabel = (threshold: number) =>
  threshold === 100 ? 'Nice!' : threshold === 250 ? 'Great!' : threshold === 500 ? 'Amazing!' : threshold === 1000 ? 'Unreal!' : 'Legendary!';

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => {
      const finishRound = async () => {
        const { roundId, log, score } = get();
        set({ status: 'submitting', tokens: [] });
        playSound('round-over', 1);
        vibrate([40, 60, 40]);
        if (!roundId) return;
        try {
          const result = await api.finishRound(roundId, log);
          usePlayerStore.getState().setPlayer(result.player);
          set({ status: 'ended', result, localBest: Math.max(get().localBest, result.score) });
          if (result.newBest) playSound('new-best', 1);
        } catch {
          set({
            status: 'ended',
            result: { score, ranked: false, reward: 0, newBest: false, offline: true, player: usePlayerStore.getState().player! },
          });
        }
      };

      return {
        ...roundDefaults,
        status: 'idle',
        roundId: null,
        ranked: false,
        seed: 0,
        countdown: 0,
        startedAt: 0,
        localBest: 0,

        startRound: async () => {
          const status = get().status;
          if (status === 'starting' || status === 'countdown' || status === 'playing' || status === 'submitting') return;
          set({ status: 'starting' });
          playSound('button-click', 1);

          try {
            const round = await api.startRound();
            usePlayerStore.getState().setPlayer(round.player);
            set({ ...roundDefaults, roundId: round.roundId, seed: round.seed, ranked: round.ranked, status: 'countdown', countdown: 3 });
          } catch {
            set({ status: 'idle' });
            throw new Error('Could not start a round. Check your connection and try again.');
          }

          for (const n of [2, 1]) {
            await new Promise((resolve) => setTimeout(resolve, 650));
            set({ countdown: n });
            playSound('equip-item', 1);
          }
          await new Promise((resolve) => setTimeout(resolve, 650));
          set({ status: 'playing', countdown: 0, startedAt: performance.now(), banner: 'Go!' });
          playSound('streak-threshold', 1);
          setTimeout(() => get().banner === 'Go!' && set({ banner: null }), 700);
        },

        tick: (rawDelta, now) => {
          const state = get();
          if (state.status !== 'playing') return;

          // Clamp so returning from a background tab doesn't teleport every token off-screen.
          const deltaMs = clamp(rawDelta, 0, 50);
          const difficulty = getDifficulty(state.score);
          const slow = now - state.startedAt < state.slowmoUntil ? 0.45 : 1;

          let spawnAccumulator = state.spawnAccumulator + deltaMs * slow;
          let spawnIndex = state.spawnIndex;
          const tokens = [...state.tokens];
          while (spawnAccumulator >= difficulty.spawnIntervalMs) {
            spawnAccumulator -= difficulty.spawnIntervalMs;
            tokens.push(...createSpawn(state.seed, spawnIndex, state.score));
            spawnIndex += 1;
          }

          let { lives, streak } = state;
          const log = state.log;
          const pops = state.pops.filter((pop) => now - pop.id < POP_LIFETIME_MS);
          let missed = false;
          const living: Token[] = [];

          for (const token of tokens) {
            const y = token.y + (token.speed * slow * deltaMs) / 1000;
            if (y > ARENA_HEIGHT + token.radius) {
              if (token.type === 'standard' || token.type === 'golden') {
                lives -= 1;
                streak = 0;
                missed = true;
                log.push({ t: Math.round(now - state.startedAt), kind: 'miss' });
                pops.push({ id: now + Math.random(), x: token.x, y: ARENA_HEIGHT - 24, label: 'Miss', kind: 'miss' });
                if (lives <= 0) break;
              }
              continue;
            }
            const x = clamp(token.x + (token.drift * deltaMs) / 1000, token.radius, ARENA_WIDTH - token.radius);
            living.push({ ...token, x, y });
          }

          if (missed) {
            playSound('life-lost', 1);
            vibrate(30);
          }

          set({
            tokens: living,
            spawnAccumulator,
            spawnIndex,
            lives: Math.max(0, lives),
            streak,
            multiplier: getStreakMultiplier(streak),
            log,
            pops,
            shake: missed ? now : state.shake,
          });

          if (lives <= 0) void finishRound();
        },

        tapToken: (tokenId) => {
          const state = get();
          if (state.status !== 'playing') return;
          const token = state.tokens.find((entry) => entry.id === tokenId);
          if (!token) return;

          const now = performance.now();
          const t = Math.round(now - state.startedAt);
          const points = pointsFor(token.type, state.streak);
          let { score, streak, lives, slowmoUntil, banner } = state;
          let shake = state.shake;
          let label = points > 0 ? `+${points}` : '';

          switch (token.type) {
            case 'standard':
              score += points;
              streak += 1;
              playSound('token-tap', clamp(streak / 20, 0.8, 2.2));
              vibrate(8);
              break;
            case 'golden':
              score += points;
              streak += 1;
              playSound('golden-token', 1);
              vibrate(12);
              break;
            case 'rocket':
              streak += 1;
              slowmoUntil = t + ROCKET_SLOWMO_MS;
              label = 'Slow-mo!';
              playSound('rocket-booster', 1);
              vibrate(15);
              break;
            case 'bomb':
              score = Math.max(0, score + points);
              lives -= 1;
              streak = 0;
              label = `${points}`;
              shake = now;
              playSound('bomb', 1);
              vibrate([60, 30, 60]);
              break;
          }

          const prevMultiplier = getStreakMultiplier(state.streak);
          const multiplier = getStreakMultiplier(streak);
          if (multiplier > prevMultiplier) {
            banner = `Combo x${multiplier}!`;
            playSound('streak-threshold', 1);
          }

          const crossed = MILESTONES.find((m) => score >= m && state.score < m);
          if (crossed) {
            banner = milestoneLabel(crossed);
            playSound('score-milestone', crossed >= 1000 ? 1.25 : 1);
          }

          if (banner !== state.banner) {
            const shown = banner;
            setTimeout(() => get().banner === shown && set({ banner: null }), 1100);
          }

          set({
            score,
            streak,
            bestStreak: Math.max(state.bestStreak, streak),
            lives: Math.max(0, lives),
            multiplier,
            slowmoUntil,
            banner,
            shake,
            tokens: state.tokens.filter((entry) => entry.id !== tokenId),
            log: [...state.log, { t, kind: token.type }],
            pops: [...state.pops, { id: now + Math.random(), x: swayX(token), y: token.y, label, kind: token.type, skin: token.skin, size: token.radius * 2 }],
          });

          if (lives <= 0) void finishRound();
        },

        reset: () => set({ ...roundDefaults, status: 'idle', roundId: null }),
      };
    },
    {
      name: 'goodtap-game',
      partialize: (state) => ({ localBest: state.localBest }),
    },
  ),
);
