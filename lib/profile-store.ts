import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProfileState = {
  name: string;
  email: string;
  verified: boolean;
  streak: number;
  gamesPlayed: number;
  totalScore: number;
  lastClaimDate: string | null;
  dailyReward: number;
  signUp: (name: string, email: string) => void;
  claimDaily: () => boolean;
  recordGame: (score: number) => void;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getNextStreak = (currentStreak: number, lastClaimDate: string | null) => {
  const today = new Date();
  const todayKey = getTodayKey();

  if (!lastClaimDate) {
    return 1;
  }

  const lastDate = new Date(`${lastClaimDate}T12:00:00Z`);
  const diffDays = Math.round((today.getTime() - lastDate.getTime()) / 86400000);

  if (diffDays === 1 && lastClaimDate !== todayKey) {
    return currentStreak + 1;
  }

  if (diffDays === 0) {
    return currentStreak;
  }

  return 1;
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      name: '',
      email: '',
      verified: false,
      streak: 0,
      gamesPlayed: 0,
      totalScore: 0,
      lastClaimDate: null,
      dailyReward: 2.4,
      signUp: (name, email) => {
        set({
          name: name.trim() || 'Player One',
          email: email.trim() || 'player@goodtap.app',
          verified: true,
          streak: get().streak || 1,
        });
      },
      claimDaily: () => {
        const todayKey = getTodayKey();
        const current = get();

        if (current.lastClaimDate === todayKey) {
          return false;
        }

        set({
          lastClaimDate: todayKey,
          streak: getNextStreak(current.streak, current.lastClaimDate),
          verified: true,
        });

        return true;
      },
      recordGame: (score) => {
        set((state) => ({
          gamesPlayed: state.gamesPlayed + 1,
          totalScore: state.totalScore + Math.max(0, score),
          streak: state.streak || 1,
        }));
      },
    }),
    {
      name: 'goodtap-profile',
    },
  ),
);
