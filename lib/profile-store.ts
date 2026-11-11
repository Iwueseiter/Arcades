import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProfileSnapshot = {
  name: string;
  email: string;
  verified: boolean;
  streak: number;
  gamesPlayed: number;
  totalScore: number;
  lastClaimDate: string | null;
  dailyReward: number;
};

export type ProfileState = ProfileSnapshot & {
  syncFromServer: () => Promise<void>;
  signUp: (name: string, email: string) => Promise<void>;
  claimDaily: () => Promise<boolean>;
  recordGame: (score: number) => Promise<void>;
};

const defaultProfile: ProfileSnapshot = {
  name: '',
  email: '',
  verified: false,
  streak: 0,
  gamesPlayed: 0,
  totalScore: 0,
  lastClaimDate: null,
  dailyReward: 2.4,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const normalizeProfile = (profile: Partial<ProfileSnapshot> | null | undefined): ProfileSnapshot => ({
  ...defaultProfile,
  ...profile,
  name: profile?.name || '',
  email: profile?.email || '',
  verified: !!profile?.verified,
  streak: Number(profile?.streak ?? 0),
  gamesPlayed: Number(profile?.gamesPlayed ?? 0),
  totalScore: Number(profile?.totalScore ?? 0),
  lastClaimDate: profile?.lastClaimDate ?? null,
  dailyReward: Number(profile?.dailyReward ?? 2.4),
});

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...defaultProfile,
      syncFromServer: async () => {
        const response = await fetch('/api/profile', { cache: 'no-store' });
        if (!response.ok) return;
        const profile = (await response.json()) as Partial<ProfileSnapshot> | null;
        set(normalizeProfile(profile));
      },
      signUp: async (name, email) => {
        const response = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'signup', name, email }),
        });

        if (!response.ok) {
          const fallback = {
            ...defaultProfile,
            name: name.trim() || 'Player One',
            email: email.trim() || 'player@goodtap.app',
            verified: true,
            streak: get().streak || 1,
          };
          set(fallback);
          return;
        }

        const profile = (await response.json()) as Partial<ProfileSnapshot> | null;
        set(normalizeProfile(profile));
      },
      claimDaily: async () => {
        const todayKey = getTodayKey();
        const current = get();
        if (current.lastClaimDate === todayKey) {
          return false;
        }

        const response = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'claim' }),
        });

        if (!response.ok) {
          return false;
        }

        const profile = (await response.json()) as Partial<ProfileSnapshot> | null;
        set(normalizeProfile(profile));
        return true;
      },
      recordGame: async (score) => {
        const response = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'record-game', score }),
        });

        if (!response.ok) {
          set((state) => ({
            gamesPlayed: state.gamesPlayed + 1,
            totalScore: state.totalScore + Math.max(0, Math.round(score)),
            streak: state.streak || 1,
          }));
          return;
        }

        const profile = (await response.json()) as Partial<ProfileSnapshot> | null;
        set(normalizeProfile(profile));
      },
    }),
    {
      name: 'goodtap-profile',
    },
  ),
);
