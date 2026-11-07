import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playSound } from '@/lib/audioManager';
import {
  ARENA_HEIGHT,
  MAX_ROUNDS_PER_DAY,
  type TapLogEntry,
  type Token,
  clamp,
  createToken,
  getDifficulty,
  getStreakMultiplier,
} from '@/lib/game-rules';

export type RoundStatus = 'idle' | 'playing' | 'ended';

export type GameStoreState = {
  roundStatus: RoundStatus;
  score: number;
  bestScore: number;
  lives: number;
  streak: number;
  multiplier: number;
  seed: number;
  tokens: Token[];
  spawnAccumulator: number;
  tapLog: TapLogEntry[];
  milestone: number;
  boostUntil: number;
  totalRounds: number;
  roundsUsed: number;
  latestMessage: string;
};

export type GameStoreActions = {
  startRound: () => void;
  tick: (deltaMs: number) => void;
  tapToken: (tokenId: string) => void;
  endRound: () => void;
};

const initialState: GameStoreState = {
  roundStatus: 'idle',
  score: 0,
  bestScore: 0,
  lives: 3,
  streak: 0,
  multiplier: 1,
  seed: 0,
  tokens: [],
  spawnAccumulator: 0,
  tapLog: [],
  milestone: 100,
  boostUntil: 0,
  totalRounds: MAX_ROUNDS_PER_DAY,
  roundsUsed: 0,
  latestMessage: 'Ready to start your first run',
};

function buildTapRecord(tokenId: string, result: TapLogEntry['result'], points: number, streak: number, score: number): TapLogEntry {
  return {
    time: Date.now(),
    tokenId,
    result,
    points,
    streak,
    score,
  };
}

export const useGameStore = create<GameStoreState & GameStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      startRound: () => {
    const nextSeed = Math.floor(Math.random() * 900000 + 100000);
    set({
      roundStatus: 'playing',
      score: 0,
      lives: 3,
      streak: 0,
      multiplier: 1,
      seed: nextSeed,
      tokens: [],
      spawnAccumulator: 0,
      tapLog: [],
      milestone: 100,
      boostUntil: 0,
      latestMessage: 'Round live',
      roundsUsed: Math.min(get().roundsUsed + 1, MAX_ROUNDS_PER_DAY),
    });
    playSound('button-click', 1);
  },
  tick: (deltaMs: number) => {
    const state = get();
    if (state.roundStatus !== 'playing') return;

    const difficulty = getDifficulty(state.score);
    const boostActive = Date.now() < state.boostUntil;
    const spawnedTokens: Token[] = [];
    let nextLives = state.lives;
    let nextStreak = state.streak;
    let nextScore = state.score;
    const nextTapLog = [...state.tapLog];
    let spawnAccumulator = state.spawnAccumulator + deltaMs;

    while (spawnAccumulator >= difficulty.spawnIntervalMs) {
      spawnAccumulator -= difficulty.spawnIntervalMs;
      const tokenId = `token-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      spawnedTokens.push(createToken(state.seed + spawnedTokens.length * 13 + state.score * 17, state.score, tokenId));
    }

    const activeTokens = [...state.tokens, ...spawnedTokens];
    const livingTokens: Token[] = [];

    for (const token of activeTokens) {
      const speedFactor = boostActive ? 0.5 : 1;
      const nextY = token.y + (token.speed * speedFactor * deltaMs) / 1000;
      const missed = nextY > ARENA_HEIGHT + token.radius;

      if (missed) {
        if (token.type === 'standard' || token.type === 'golden') {
          nextLives = Math.max(0, nextLives - 1);
          nextStreak = 0;
          nextTapLog.push(buildTapRecord(token.id, 'miss', 0, nextStreak, nextScore));
          playSound('life-lost', 1);
        }
        continue;
      }

      livingTokens.push({ ...token, y: nextY, rotation: token.rotation + 0.18 });
    }

    if (nextLives <= 0) {
      set({
        roundStatus: 'ended',
        lives: 0,
        streak: 0,
        tokens: [],
        tapLog: nextTapLog,
      });
      playSound('round-over', 1);
      return;
    }

    const nextMultiplier = getStreakMultiplier(nextStreak);
    const nextState = {
      ...state,
      lives: nextLives,
      streak: nextStreak,
      multiplier: nextMultiplier,
      tokens: livingTokens,
      spawnAccumulator,
      score: nextScore,
      tapLog: nextTapLog,
    };

    set(nextState);
  },
  tapToken: (tokenId: string) => {
    const state = get();
    if (state.roundStatus !== 'playing') return;

    const tokenIndex = state.tokens.findIndex((token) => token.id === tokenId);
    if (tokenIndex === -1) return;

    const token = state.tokens[tokenIndex];
    const nextTokens = state.tokens.filter((entry) => entry.id !== tokenId);
    let nextScore = state.score;
    let nextStreak = state.streak;
    let nextLives = state.lives;
    let nextBoostUntil = state.boostUntil;
    let points = 0;
    let result: TapLogEntry['result'] = 'hit';

    if (token.type === 'standard') {
      const base = 10 * state.multiplier;
      points = base;
      nextStreak += 1;
      nextScore += points;
    }

    if (token.type === 'golden') {
      const base = 20 * state.multiplier;
      points = base;
      nextStreak += 1;
      nextScore += points;
      playSound('golden-token', 1);
    }

    if (token.type === 'rocket') {
      nextStreak += 1;
      nextBoostUntil = Date.now() + 5000;
      result = 'rocket';
      playSound('rocket-booster', 1);
    }

    if (token.type === 'bomb') {
      nextScore = Math.max(0, nextScore - 15);
      nextLives = Math.max(0, nextLives - 1);
      nextStreak = 0;
      result = 'bomb';
      points = -15;
      playSound('bomb', 1);
    }

    if (token.type !== 'bomb' && token.type !== 'rocket') {
      playSound('token-tap', clamp(nextStreak / 20, 0.8, 2.2));
    }

    if (nextStreak >= 10 && state.streak < 10) {
      playSound('streak-threshold', 1);
    }

    const multiplier = getStreakMultiplier(nextStreak);
    const newTapLog = [...state.tapLog, buildTapRecord(token.id, result, points, nextStreak, nextScore)];

    let nextMilestone = state.milestone;
    let nextLatestMessage = state.latestMessage;
    const thresholdList = [100, 250, 500, 1000, 2000, 5000];
    for (const threshold of thresholdList) {
      if (nextScore >= threshold && state.score < threshold) {
        nextMilestone = threshold;
        nextLatestMessage = threshold === 100 ? 'Nice!' : threshold === 250 ? 'Great!' : threshold === 500 ? 'Amazing!' : threshold === 1000 ? 'Unreal!' : 'Legendary!';
        playSound('score-milestone', threshold >= 5000 ? 1.5 : threshold >= 1000 ? 1.25 : 1);
        break;
      }
    }

    const nextBestScore = Math.max(state.bestScore, nextScore);

    if (nextScore > state.bestScore) {
      nextLatestMessage = 'New personal best!';
      playSound('new-best', 1);
    }

    if (nextLives <= 0) {
      const updatedScore = Math.max(0, nextScore);
      set({
        score: updatedScore,
        bestScore: nextBestScore,
        lives: 0,
        streak: nextStreak,
        multiplier,
        tokens: nextTokens,
        tapLog: newTapLog,
        milestone: nextMilestone,
        latestMessage: nextLatestMessage,
        roundStatus: 'ended',
      });
      playSound('round-over', 1);
      return;
    }

    set({
      score: Math.max(0, nextScore),
      bestScore: nextBestScore,
      lives: nextLives,
      streak: nextStreak,
      multiplier,
      tokens: nextTokens,
      tapLog: newTapLog,
      milestone: nextMilestone,
      boostUntil: nextBoostUntil,
      latestMessage: nextLatestMessage,
    });

    if (nextStreak >= 10) {
      playSound('streak-threshold', 1);
    }
  },
  endRound: () => {
    const state = get();
    const finalScore = Math.max(0, state.score);
        const nextBestScore = Math.max(state.bestScore, finalScore);
        set({
          roundStatus: 'ended',
          score: finalScore,
          bestScore: nextBestScore,
          tokens: [],
          latestMessage: finalScore >= state.bestScore ? 'New personal best!' : 'Round complete',
        });
        playSound(finalScore >= state.bestScore ? 'new-best' : 'round-over', 1);
      },
    }),
    {
      name: 'goodtap-game-state',
      partialize: (state) => ({
        bestScore: state.bestScore,
        roundsUsed: state.roundsUsed,
        totalRounds: state.totalRounds,
      }),
    },
  ),
);
