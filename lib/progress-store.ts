import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playSound } from '@/lib/audioManager';
import { getTodayKey, mulberry32, type Skin } from '@/lib/game-rules';

/** What one finished round contributes to missions. */
export type RoundStats = {
  score: number;
  level: number;
  maxMultiplier: number;
  bestStreak: number;
  collected: Partial<Record<Skin, number>>;
};

type Metric = 'bubbles' | 'jellies' | 'coins' | 'candies' | 'stars' | 'score' | 'combo' | 'level' | 'streak' | 'rounds';

export type Mission = {
  id: string;
  title: string;
  metric: Metric;
  goal: number;
  xp: number;
  progress: number;
  claimed: boolean;
};

// Counted metrics add up across the day's rounds; best-of metrics keep the highest single round.
const BEST_OF: Metric[] = ['score', 'combo', 'level', 'streak'];

const POOL: Omit<Mission, 'progress' | 'claimed'>[] = [
  { id: 'bubbles-25', title: 'Pop 25 bubbles', metric: 'bubbles', goal: 25, xp: 80 },
  { id: 'jellies-30', title: 'Squish 30 jellies', metric: 'jellies', goal: 30, xp: 90 },
  { id: 'coins-30', title: 'Grab 30 G$ coins', metric: 'coins', goal: 30, xp: 80 },
  { id: 'candies-20', title: 'Crunch 20 candies', metric: 'candies', goal: 20, xp: 70 },
  { id: 'stars-6', title: 'Catch 6 star coins', metric: 'stars', goal: 6, xp: 100 },
  { id: 'score-600', title: 'Score 600 in one round', metric: 'score', goal: 600, xp: 120 },
  { id: 'combo-3', title: 'Get a x3 combo', metric: 'combo', goal: 3, xp: 110 },
  { id: 'level-3', title: 'Reach Jelly Jungle (level 3)', metric: 'level', goal: 3, xp: 120 },
  { id: 'streak-20', title: 'Catch 20 in a row', metric: 'streak', goal: 20, xp: 90 },
  { id: 'rounds-3', title: 'Play 3 rounds', metric: 'rounds', goal: 3, xp: 60 },
];

function missionsFor(day: string): Mission[] {
  let seed = 0;
  for (const c of day) seed = (seed * 31 + c.charCodeAt(0)) | 0;
  const rng = mulberry32(seed);
  const pool = [...POOL];
  const picked: Mission[] = [];
  while (picked.length < 3) {
    const [mission] = pool.splice(Math.floor(rng() * pool.length), 1);
    picked.push({ ...mission, progress: 0, claimed: false });
  }
  return picked;
}

function metricValue(metric: Metric, stats: RoundStats) {
  const c = stats.collected;
  switch (metric) {
    case 'bubbles':
      return c.bubble ?? 0;
    case 'jellies':
      return (c['jelly-drop'] ?? 0) + (c['jelly-cube'] ?? 0);
    case 'coins':
      return c.coin ?? 0;
    case 'candies':
      return c.candy ?? 0;
    case 'stars':
      return c.golden ?? 0;
    case 'score':
      return stats.score;
    case 'combo':
      return stats.maxMultiplier;
    case 'level':
      return stats.level;
    case 'streak':
      return stats.bestStreak;
    case 'rounds':
      return 1;
  }
}

/** XP needed to go from `level` to `level + 1`. */
export const xpToNext = (level: number) => 100 + (level - 1) * 60;

export function levelFromXp(xp: number) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level += 1;
  }
  return { level, into: remaining, needed: xpToNext(level) };
}

type ProgressState = {
  xp: number;
  day: string;
  missions: Mission[];
  ensureToday: () => void;
  recordRound: (stats: RoundStats) => { xpGained: number; completed: Mission[] };
  claim: (id: string) => number;
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      xp: 0,
      day: '',
      missions: [],

      ensureToday: () => {
        const today = getTodayKey();
        if (get().day !== today) set({ day: today, missions: missionsFor(today) });
      },

      recordRound: (stats) => {
        get().ensureToday();
        const completed: Mission[] = [];
        const missions = get().missions.map((mission) => {
          if (mission.claimed || mission.progress >= mission.goal) return mission;
          const value = metricValue(mission.metric, stats);
          const progress = Math.min(
            mission.goal,
            BEST_OF.includes(mission.metric) ? Math.max(mission.progress, value) : mission.progress + value,
          );
          const next = { ...mission, progress };
          if (progress >= mission.goal) completed.push(next);
          return next;
        });
        // Every round earns XP from its score, so progress never stalls.
        const xpGained = Math.max(5, Math.round(stats.score / 10));
        set({ missions, xp: get().xp + xpGained });
        if (completed.length) playSound('mission-complete', 1);
        return { xpGained, completed };
      },

      claim: (id) => {
        const mission = get().missions.find((entry) => entry.id === id);
        if (!mission || mission.claimed || mission.progress < mission.goal) return 0;
        set({
          xp: get().xp + mission.xp,
          missions: get().missions.map((entry) => (entry.id === id ? { ...entry, claimed: true } : entry)),
        });
        playSound('level-up', 1);
        return mission.xp;
      },
    }),
    { name: 'xurri-progress' },
  ),
);
