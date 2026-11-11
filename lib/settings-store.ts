import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toggleAudioMute } from '@/lib/audioManager';

type SettingsState = {
  muted: boolean;
  haptics: boolean;
  toggleMuted: () => void;
  toggleHaptics: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      muted: false,
      haptics: true,
      toggleMuted: () => {
        const muted = !get().muted;
        toggleAudioMute(muted);
        set({ muted });
      },
      toggleHaptics: () => set({ haptics: !get().haptics }),
    }),
    {
      name: 'goodtap-settings',
      onRehydrateStorage: () => (state) => {
        if (state) toggleAudioMute(state.muted);
      },
    },
  ),
);

export function vibrate(pattern: number | number[]) {
  if (!useSettingsStore.getState().haptics) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}
