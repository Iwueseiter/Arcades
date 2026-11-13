'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useBalance } from '@/lib/use-economy';
import { isSignedIn } from '@/lib/access';
import { formatG } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';
import { useSettingsStore } from '@/lib/settings-store';

export function TopBar({ onOpenProfile }: { onOpenProfile: () => void }) {
  const balance = useBalance();
  const player = usePlayerStore((s) => s.player);
  const { muted, toggleMuted } = useSettingsStore();

  // Label for the balance chip
  let balanceLabel: React.ReactNode;
  if (balance !== null) {
    balanceLabel = <span className="num">{formatG(balance)}</span>;
  } else if (isSignedIn(player)) {
    // Signed in but balance not loaded yet (chain state loading)
    balanceLabel = <span className="num">–</span>;
  } else {
    balanceLabel = <span className="text-muted">G$</span>;
  }

  return (
    <header className="topbar">
      <Logo />

      <button type="button" className="chip" onClick={onOpenProfile} aria-label="G$ balance — open profile">
        <span className="chip-coin">G$</span>
        {balanceLabel}
      </button>

      <button type="button" className="icon-btn" onClick={toggleMuted} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </header>
  );
}
