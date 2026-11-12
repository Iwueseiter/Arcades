import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { playSound, setMusicIntensity, startMusic, stopMusic, type SoundEventName } from '@/lib/audioManager';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  MILESTONES,
  ROCKET_SLOWMO_MS,
  STARTING_LIVES,
  type Skin,
  type TapLogEntry,
  type Token,
  type TokenType,
  clamp,
  createSpawn,
  getDifficulty,
  getStreakMultiplier,
  levelForScore,
  pointsFor,
  swayX,
  worldForLevel,
} from '@/lib/game-rules';
import { usePlayerStore } from '@/lib/player-store';
import { useProgressStore, type Mission } from '@/lib/progress-store';
import { vibrate } from '@/lib/settings-store';
import type { RoundFinishResponse } from '@/lib/types';

export type RoundStatus = 'idle' | 'starting' | 'countdown' | 'playing' | 'paused' | 'submitting' | 'ended';

export type Pop = { id: number; x: number; y: number; label: string; kind: TokenType | 'miss'; skin?: Skin; size?: number };

export type MascotMood = 'idle' | 'happy' | 'excited' | 'sad' | 'wow';

type RoundResult = RoundFinishResponse & {
  rejected?: string;
  offline?: boolean;
  xpGained?: number;
  completed?: Mission[];
  level?: number;
};

type GameState = {
  status: RoundStatus;
  roundId: string | null;
  ranked: boolean;
  seed: number;
  countdown: number;
  startedAt: number;
  pausedAt: number;
  arenaHeight: number;
  score: number;
  level: number;
  lives: number;
  streak: number;
  bestStreak: number;
  maxMultiplier: number;
  multiplier: number;
  collected: Partial<Record<Skin, number>>;
  tokens: Token[];
  spawnIndex: number;
  spawnAccumulator: number;
  slowmoUntil: number;
  log: TapLogEntry[];
  pops: Pop[];
  shake: number;
  banner: { title: string; subtitle?: string } | null;
  /** Big celebration word, e.g. "Juicy!". `tier` 1–5 sets its colour and how loud the jingle is. */
  callout: { text: string; tier: number; at: number } | null;
  recentTaps: number[];
  mascot: { mood: MascotMood; line: string | null; at: number };
  result: RoundResult | null;
  localBest: number;
};

type GameActions = {
  startRound: () => Promise<void>;
  tick: (deltaMs: number, now: number) => void;
  tapToken: (tokenId: string) => void;
  pause: () => void;
  resume: () => void;
  quit: () => void;
  exit: () => void;
  setArenaHeight: (height: number) => void;
};

const POP_LIFETIME_MS = 750;

const roundDefaults = {
  score: 0,
  level: 1,
  lives: STARTING_LIVES,
  streak: 0,
  bestStreak: 0,
  maxMultiplier: 1,
  multiplier: 1,
  collected: {},
  tokens: [] as Token[],
  spawnIndex: 0,
  spawnAccumulator: 0,
  slowmoUntil: 0,
  log: [] as TapLogEntry[],
  pops: [] as Pop[],
  shake: 0,
  banner: null,
  callout: null,
  recentTaps: [] as number[],
  result: null,
};

// Celebration words. Streak words fire at exact streak counts; milestone words when the score crosses a mark.
const STREAK_WORDS: Record<number, [string, number]> = {
  5: ['Yummy!', 1],
  10: ['Juicy!', 2],
  15: ['Scrumptious!', 2],
  20: ['Pop-tastic!', 3],
  30: ['Sugar Rush!', 4],
  40: ['Unstoppable!', 4],
  50: ['Treat Legend!', 5],
};

const MILESTONE_WORDS: Record<number, [string, number]> = {
  100: ['Lovely!', 2],
  250: ['Splendid!', 3],
  500: ['Fantastic!', 3],
  1000: ['Marvelous!', 4],
  2000: ['Legendary!', 5],
  5000: ['Out of this world!', 5],
};

const QUICK_POP_MS = 900;

const POP_SOUND: Partial<Record<Skin, SoundEventName>> = {
  coin: 'pop-coin',
  'jelly-drop': 'pop-jelly',
  'jelly-cube': 'pop-jelly',
  bubble: 'pop-bubble',
  candy: 'pop-candy',
};

const HAPPY_LINES = ['Yum!', 'Tasty!', 'So good!', 'Keep going!', 'Wheee!', 'Pop pop!'];
const SAD_LINES = ['Oops!', 'Aww…', 'Missed one!', 'Uh-oh!'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => {
      const cheer = (mood: MascotMood, line: string | null) => set({ mascot: { mood, line, at: performance.now() } });

      const shout = (text: string, tier: number) => {
        const callout = { text, tier, at: performance.now() };
        set({ callout });
        playSound('callout', tier);
        setTimeout(() => get().callout === callout && set({ callout: null }), 1150);
      };

      const showBanner = (banner: GameState['banner'], ms = 1300) => {
        set({ banner });
        setTimeout(() => get().banner === banner && set({ banner: null }), ms);
      };

      const finishRound = async () => {
        const state = get();
        const { roundId, log, score } = state;
        set({ status: 'submitting', tokens: [] });
        stopMusic();
        playSound('round-over', 1);
        vibrate([40, 60, 40]);

        const progress = useProgressStore.getState().recordRound({
          score,
          level: state.level,
          maxMultiplier: state.maxMultiplier,
          bestStreak: state.bestStreak,
          collected: state.collected,
        });

        if (!roundId) return;
        try {
          // Let the sad-bubble moment play before the results card appears.
          const [result] = await Promise.all([api.finishRound(roundId, log), sleep(1700)]);
          usePlayerStore.getState().setPlayer(result.player);
          set({ status: 'ended', result: { ...result, ...progress, level: state.level }, localBest: Math.max(get().localBest, result.score) });
          if (result.newBest) {
            playSound('new-best', 1);
            cheer('excited', 'New best! You rock!');
          } else {
            cheer(score > 0 ? 'happy' : 'sad', score > 0 ? 'Nice run!' : 'Let’s try again!');
          }
        } catch {
          await sleep(1200);
          set({
            status: 'ended',
            result: {
              score,
              ranked: false,
              reward: 0,
              newBest: false,
              offline: true,
              player: usePlayerStore.getState().player!,
              ...progress,
              level: state.level,
            },
          });
          cheer('sad', 'We lost connection…');
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
        pausedAt: 0,
        arenaHeight: ARENA_HEIGHT,
        mascot: { mood: 'idle', line: null, at: 0 },
        localBest: 0,

        setArenaHeight: (height) => set({ arenaHeight: clamp(height, 300, 900) }),

        startRound: async () => {
          const status = get().status;
          if (status === 'starting' || status === 'countdown' || status === 'playing' || status === 'paused' || status === 'submitting') return;
          set({ status: 'starting', result: null });
          playSound('button-click', 1);

          try {
            const round = await api.startRound();
            usePlayerStore.getState().setPlayer(round.player);
            set({ ...roundDefaults, collected: {}, roundId: round.roundId, seed: round.seed, ranked: round.ranked, status: 'countdown', countdown: 3 });
          } catch {
            set({ status: 'idle' });
            throw new Error('Couldn’t start. Check your internet and try again.');
          }

          cheer('excited', 'Get ready!');
          playSound('countdown', 1);
          for (const n of [2, 1]) {
            await sleep(700);
            if (get().status !== 'countdown') return;
            set({ countdown: n });
            playSound('countdown', 1);
          }
          await sleep(700);
          if (get().status !== 'countdown') return;
          set({ status: 'playing', countdown: 0, startedAt: performance.now() });
          playSound('go', 1);
          setMusicIntensity(1);
          startMusic();
          showBanner({ title: 'Go!', subtitle: worldForLevel(1).name }, 900);
          cheer('happy', 'Pop them all!');
        },

        tick: (rawDelta, now) => {
          const state = get();
          if (state.status !== 'playing') return;

          // Clamp so returning from a background tab doesn't teleport every token off-screen.
          const deltaMs = clamp(rawDelta, 0, 50);
          const difficulty = getDifficulty(state.score);
          const slow = now - state.startedAt < state.slowmoUntil ? 0.45 : 1;
          // Taller screens get proportionally faster falls, so the time to react feels the same.
          const heightScale = state.arenaHeight / ARENA_HEIGHT;

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
            const y = token.y + (token.speed * heightScale * slow * deltaMs) / 1000;
            if (y > state.arenaHeight + token.radius) {
              if (token.type === 'standard' || token.type === 'golden') {
                lives -= 1;
                streak = 0;
                missed = true;
                log.push({ t: Math.round(now - state.startedAt), kind: 'miss' });
                pops.push({ id: now + Math.random(), x: token.x, y: state.arenaHeight - 30, label: 'Miss', kind: 'miss' });
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
            setMusicIntensity(1);
            cheer('sad', SAD_LINES[Math.floor(Math.random() * SAD_LINES.length)]);
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
          let { score, streak, lives, slowmoUntil } = state;
          let shake = state.shake;
          let label = points > 0 ? `+${points}` : '';

          switch (token.type) {
            case 'standard':
              score += points;
              streak += 1;
              playSound(POP_SOUND[token.skin] ?? 'pop-coin', clamp(0.8 + streak / 25, 0.8, 2.2));
              vibrate(8);
              break;
            case 'golden':
              score += points;
              streak += 1;
              playSound('golden-token', 1);
              vibrate(12);
              cheer('wow', 'Ooh, shiny!');
              break;
            case 'rocket':
              streak += 1;
              slowmoUntil = t + ROCKET_SLOWMO_MS;
              label = 'Slow-mo!';
              playSound('rocket-booster', 1);
              vibrate(15);
              cheer('excited', 'Slooow mooo!');
              break;
            case 'bomb':
              score = Math.max(0, score + points);
              lives -= 1;
              streak = 0;
              label = `${points}`;
              shake = now;
              playSound('bomb', 1);
              vibrate([60, 30, 60]);
              setMusicIntensity(1);
              cheer('sad', 'Ouch! Not the bombs!');
              break;
          }

          const prevMultiplier = getStreakMultiplier(state.streak);
          const multiplier = getStreakMultiplier(streak);
          if (multiplier > prevMultiplier) {
            setMusicIntensity(multiplier);
            cheer('excited', multiplier >= 3 ? 'FEVER MODE!' : `x${multiplier} combo!`);
          } else if (token.type === 'standard' && streak > 0 && streak % 8 === 0) {
            cheer('happy', HAPPY_LINES[Math.floor(Math.random() * HAPPY_LINES.length)]);
          }

          // Pick the single best thing to shout about this tap: level > milestone > streak > quick pops > star coin.
          const recentTaps = token.type === 'bomb' ? [] : [...state.recentTaps.filter((at) => now - at < QUICK_POP_MS), now];
          const crossed = MILESTONES.find((m) => score >= m && state.score < m);
          const level = levelForScore(score);
          const streakWord = token.type !== 'bomb' ? STREAK_WORDS[streak] ?? (streak > 50 && streak % 25 === 0 ? (['Treat Legend!', 5] as [string, number]) : undefined) : undefined;
          if (level > state.level) {
            // the level banner below takes the stage
          } else if (crossed) {
            shout(...MILESTONE_WORDS[crossed]);
          } else if (streakWord) {
            shout(...streakWord);
          } else if (recentTaps.length === 5) {
            shout('Pop frenzy!', 3);
          } else if (recentTaps.length === 3) {
            shout('Triple pop!', 2);
          } else if (token.type === 'golden') {
            shout('Shiny!', 2);
          }

          if (level > state.level) {
            const world = worldForLevel(level);
            showBanner({ title: `Level ${level}`, subtitle: `Welcome to ${world.name}` }, 1800);
            playSound('level-up', 1);
            vibrate([20, 40, 20, 40, 60]);
            cheer('wow', `${world.name}! Woah!`);
          }

          const collected = token.type === 'bomb' || token.type === 'rocket' ? state.collected : { ...state.collected, [token.skin]: (state.collected[token.skin] ?? 0) + 1 };

          set({
            score,
            level,
            streak,
            bestStreak: Math.max(state.bestStreak, streak),
            maxMultiplier: Math.max(state.maxMultiplier, multiplier),
            lives: Math.max(0, lives),
            multiplier,
            collected,
            recentTaps,
            slowmoUntil,
            shake,
            tokens: state.tokens.filter((entry) => entry.id !== tokenId),
            log: [...state.log, { t, kind: token.type }],
            pops: [...state.pops, { id: now + Math.random(), x: swayX(token), y: token.y, label, kind: token.type, skin: token.skin, size: token.radius * 2 }],
          });

          if (lives <= 0) void finishRound();
        },

        pause: () => {
          if (get().status !== 'playing') return;
          set({ status: 'paused', pausedAt: performance.now() });
          stopMusic();
          playSound('button-click', 1);
        },

        resume: () => {
          const state = get();
          if (state.status !== 'paused') return;
          // Shift the round clock so the pause doesn't count toward slow-mo or the server's timing.
          set({ status: 'playing', startedAt: state.startedAt + (performance.now() - state.pausedAt) });
          setMusicIntensity(state.multiplier);
          startMusic();
          playSound('go', 1);
        },

        quit: () => {
          const status = get().status;
          if (status === 'playing' || status === 'paused') void finishRound();
        },

        exit: () => {
          stopMusic();
          set({ ...roundDefaults, status: 'idle', roundId: null, mascot: { mood: 'idle', line: null, at: 0 } });
        },
      };
    },
    {
      name: 'xurri-game',
      partialize: (state) => ({ localBest: state.localBest }),
    },
  ),
);
