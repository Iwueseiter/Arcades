import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setMusicEnabled, toggleAudioMute } from '@/lib/audioManager';

type SettingsState = {
  muted: boolean;
  music: boolean;
  haptics: boolean;
  toggleMuted: () => void;
  toggleMusic: () => void;
  toggleHaptics: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      muted: false,
      music: true,
      haptics: true,
      toggleMuted: () => {
        const muted = !get().muted;
        toggleAudioMute(muted);
        set({ muted });
      },
      toggleMusic: () => {
        const music = !get().music;
        setMusicEnabled(music);
        set({ music });
      },
      toggleHaptics: () => set({ haptics: !get().haptics }),
    }),
    {
      name: 'xurri-settings',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        toggleAudioMute(state.muted);
        setMusicEnabled(state.music);
      },
    },
  ),
);

export function vibrate(pattern: number | number[]) {
  if (!useSettingsStore.getState().haptics) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}
