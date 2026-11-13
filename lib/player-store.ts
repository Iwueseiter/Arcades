import { create } from 'zustand';
import { api } from '@/lib/api';
import type { PlayerSnapshot } from '@/lib/types';

type PlayerState = {
  player: PlayerSnapshot | null;
  refresh: () => Promise<void>;
  setPlayer: (player: PlayerSnapshot) => void;
};

/** A minimal guest snapshot used when /api/me is unreachable, so the app never stays blank. */
function offlineGuest(): PlayerSnapshot {
  return {
    id: '',
    name: '',
    displayName: '',
    email: '',
    address: null,
    signedInEmail: null,
    bestScore: 0,
    weeklyBest: 0,
    gamesPlayed: 0,
    totalScore: 0,
    roundsLeft: 0,
    maxRounds: 0,
    earned: 0,
    banned: false,
    demo: { balance: 0, purchases: [], claimedToday: false, streak: 0 },
  };
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  player: null,
  refresh: async () => {
    try {
      set({ player: await api.me() });
    } catch {
      // /api/me failed (network error, missing env vars, etc.).
      // Fall back to a guest snapshot so the app never stays on a blank screen.
      set({ player: offlineGuest() });
    }
  },
  setPlayer: (player) => set({ player }),
}));
