import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { playSound } from '@/lib/audioManager';
import type { MascotMood } from '@/lib/game-store';
import { move as applyMove, newGame, replay, tierInfo, type Dir, type MergeGame } from '@/lib/merge-engine';
import { usePlayerStore } from '@/lib/player-store';
import { useProgressStore, type Mission } from '@/lib/progress-store';
import { vibrate } from '@/lib/settings-store';
import type { MergeToday } from '@/lib/types';

export type MergeMode = 'daily' | 'practice';

type MergeResult = {
  score: number;
  maxTier: number;
  reward: number;
  rank: number | null;
  xpGained: number;
  completed: Mission[];
  error?: string;
};

type MergeState = {
  status: 'idle' | 'loading' | 'playing' | 'submitting' | 'over';
  mode: MergeMode | null;
  game: MergeGame | null;
  runId: string | null;
  number: number | null;
  today: MergeToday | null;
  result: MergeResult | null;
  practiceBest: number;
  /** Moves of an unfinished daily run, so a reload resumes instead of losing progress. */
  saved: Record<string, string>;
  mascot: { mood: MascotMood; line: string | null; at: number };
  loadToday: () => Promise<void>;
  startDaily: () => Promise<void>;
  startPractice: () => void;
  swipe: (dir: Dir) => void;
  finish: () => Promise<void>;
  exit: () => void;
};

const PRAISE: Record<number, string> = {
  4: 'Sweet candy!',
  5: 'Lollipop time!',
  6: 'A donut! Yum!',
  7: 'Cupcake!! 🧁',
  8: 'A real G$ coin!',
  9: 'STAR COIN! ⭐',
  10: 'A crown?! Royal!',
  11: 'IT’S ME! 🌈',
};

export const useMergeStore = create<MergeState>()(
  persist(
    (set, get) => {
      const cheer = (mood: MascotMood, line: string | null) => set({ mascot: { mood, line, at: performance.now() } });

      return {
        status: 'idle',
        mode: null,
        game: null,
        runId: null,
        number: null,
        today: null,
        result: null,
        practiceBest: 0,
        saved: {},
        mascot: { mood: 'idle', line: null, at: 0 },

        loadToday: async () => {
          try {
            set({ today: await api.mergeToday() });
          } catch {
            // the lobby card just shows a placeholder until this loads
          }
        },

        startDaily: async () => {
          set({ status: 'loading', mode: 'daily', result: null });
          try {
            const run = await api.mergeStart();
            const savedMoves = get().saved[run.runId] ?? '';
            const resumed = savedMoves ? replay(run.seed, savedMoves) : null;
            const game = resumed?.ok ? resumed.game : newGame(run.seed);
            set({ status: 'playing', game, runId: run.runId, number: run.number });
            playSound('go', 1);
            cheer('excited', resumed?.ok ? 'Welcome back!' : `Puzzle #${run.number}! Let’s go!`);
          } catch (error) {
            set({ status: 'idle', mode: null });
            throw error;
          }
        },

        startPractice: () => {
          set({ status: 'playing', mode: 'practice', game: newGame(Math.floor(Math.random() * 2 ** 31)), runId: null, result: null });
          playSound('go', 1);
          cheer('happy', 'Practice makes perfect!');
        },

        swipe: (dir) => {
          const { game, status, runId, mode } = get();
          if (status !== 'playing' || !game) return;
          const next = applyMove(game, dir);
          if (!next) {
            vibrate(12);
            return;
          }

          if (next.lastGain > 0) {
            const top = Math.max(...next.tiles.filter((tile) => tile.born === 'merge').map((tile) => tile.tier));
            playSound(top >= 6 ? 'golden-token' : 'pop-jelly', Math.min(2.2, 0.8 + top * 0.12));
            vibrate(top >= 6 ? [15, 30, 15] : 10);
          } else {
            playSound('button-click', 0.7);
          }

          if (next.maxTier > game.maxTier && next.maxTier >= 4) {
            playSound('level-up', 1);
            cheer('wow', PRAISE[next.maxTier] ?? `${tierInfo(next.maxTier).name}!`);
          } else if (next.lastGain >= 64) {
            cheer('happy', 'Combo merge!');
          } else if (next.tiles.length >= 14 && game.tiles.length < 14) {
            cheer('sad', 'Getting crowded…');
          }

          const saved = mode === 'daily' && runId ? { ...get().saved, [runId]: next.moves } : get().saved;
          set({ game: next, saved });
          if (next.over) void get().finish();
        },

        finish: async () => {
          const { game, mode, runId } = get();
          if (!game || get().status === 'submitting') return;
          set({ status: 'submitting' });
          playSound('round-over', 1);
          const progress = useProgressStore.getState().recordMerge({ score: game.score, maxTier: game.maxTier });

          if (mode === 'practice' || !runId) {
            const best = Math.max(get().practiceBest, game.score);
            set({
              status: 'over',
              practiceBest: best,
              result: { score: game.score, maxTier: game.maxTier, reward: 0, rank: null, ...progress },
            });
            cheer(game.score >= best && game.score > 0 ? 'excited' : 'happy', game.score >= best && game.score > 0 ? 'New practice best!' : 'Nice try!');
            return;
          }

          try {
            const result = await api.mergeFinish(runId, game.moves);
            usePlayerStore.getState().setPlayer(result.player);
            const saved = { ...get().saved };
            delete saved[runId];
            set({ status: 'over', saved, result: { score: result.score, maxTier: result.maxTier, reward: result.reward, rank: result.rank, ...progress } });
            if (result.rank <= 3) playSound('new-best', 1);
            cheer(result.rank <= 3 ? 'excited' : 'happy', result.rank === 1 ? 'You’re #1 today!' : `Rank #${result.rank} today!`);
            void get().loadToday();
          } catch (error) {
            set({
              status: 'over',
              result: {
                score: game.score,
                maxTier: game.maxTier,
                reward: 0,
                rank: null,
                ...progress,
                error: error instanceof Error ? error.message : 'Could not submit your run',
              },
            });
            cheer('sad', 'Couldn’t save that one…');
          }
        },

        exit: () => set({ status: 'idle', mode: null, game: null, runId: null, result: null }),
      };
    },
    {
      name: 'goodtap-merge',
      partialize: (state) => ({ practiceBest: state.practiceBest, saved: state.saved }),
    },
  ),
);
