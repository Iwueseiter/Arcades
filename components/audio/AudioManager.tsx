'use client';

import { useEffect } from 'react';
import { unlockAudio } from '@/lib/audioManager';

export function AudioManager() {
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  return null;
}
