import { create } from 'zustand';
import { api } from '@/lib/api';
import type { PlayerSnapshot } from '@/lib/types';

type PlayerState = {
  player: PlayerSnapshot | null;
  refresh: () => Promise<void>;
  setPlayer: (player: PlayerSnapshot) => void;
};

export const usePlayerStore = create<PlayerState>()((set) => ({
  player: null,
  refresh: async () => {
    try {
      set({ player: await api.me() });
    } catch {
      // Keep the last known snapshot; the UI shows placeholders until the first load succeeds.
    }
  },
  setPlayer: (player) => set({ player }),
}));
