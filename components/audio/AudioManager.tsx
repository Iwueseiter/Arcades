'use client';

import { useEffect } from 'react';
import { playSound } from '@/lib/audioManager';

export function AudioManager() {
  useEffect(() => {
    const unlock = () => {
      const AudioCtor = typeof window !== 'undefined'
        ? (window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : null;

      if (AudioCtor) {
        const ctx = new AudioCtor();
        ctx.resume();
      }

      playSound('button-click', 1);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return null;
}
