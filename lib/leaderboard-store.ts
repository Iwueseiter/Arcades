import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LeaderboardEntry = {
  name: string;
  score: number;
  badge: string;
};

export const defaultLeaderboard: LeaderboardEntry[] = [
  { name: 'Nova', score: 15240, badge: '🏆' },
  { name: 'Pixel', score: 13880, badge: '🥈' },
  { name: 'Orbit', score: 12110, badge: '🥉' },
  { name: 'Luma', score: 10860, badge: '✨' },
  { name: 'Milo', score: 9250, badge: '🔥' },
];

export type LeaderboardState = {
  entries: LeaderboardEntry[];
  syncFromServer: () => Promise<void>;
  updateScore: (name: string, score: number) => void;
  addEntry: (entry: LeaderboardEntry) => void;
};

const fetchLeaderboardState = async () => {
  const response = await fetch('/api/leaderboard', { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as { entries: LeaderboardEntry[] };
};

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set) => ({
      entries: defaultLeaderboard,
      syncFromServer: async () => {
        const serverState = await fetchLeaderboardState();
        if (!serverState) return;
        set({
          entries: Array.isArray(serverState.entries) ? serverState.entries : defaultLeaderboard,
        });
      },
      updateScore: (name, score) => {
        set((state) => {
          const next = [...state.entries];
          const index = next.findIndex((entry) => entry.name.toLowerCase() === name.toLowerCase());

          if (index >= 0) {
            next[index] = { ...next[index], score: Math.max(next[index].score, score) };
          } else {
            next.push({ name, score, badge: '✨' });
          }

          const sortedEntries = next.sort((a, b) => b.score - a.score).slice(0, 5);
          fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', name, score }),
          }).catch(() => undefined);

          return {
            entries: sortedEntries,
          };
        });
      },
      addEntry: (entry) => {
        set((state) => {
          const nextEntries = [...state.entries, entry].sort((a, b) => b.score - a.score).slice(0, 5);
          fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', entry }),
          }).catch(() => undefined);

          return {
            entries: nextEntries,
          };
        });
      },
    }),
    { name: 'goodtap-leaderboard' },
  ),
);
