'use client';

import { Volume2, VolumeX, Zap } from 'lucide-react';
import { useBalance } from '@/lib/use-economy';
import { formatG } from '@/lib/format';
import { useSettingsStore } from '@/lib/settings-store';

export function TopBar({ onOpenProfile }: { onOpenProfile: () => void }) {
  const balance = useBalance();
  const { muted, toggleMuted } = useSettingsStore();

  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-mark" aria-hidden>
          <Zap size={18} fill="white" strokeWidth={0} />
        </span>
        <span>
          Good<em>Tap</em>
        </span>
      </div>

      <button type="button" className="chip" onClick={onOpenProfile} aria-label="G$ balance">
        <span className="chip-coin">G$</span>
        {balance === null ? <span className="text-muted">Connect</span> : <span className="num">{formatG(balance)}</span>}
      </button>

      <button type="button" className="icon-btn" onClick={toggleMuted} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </header>
  );
}
