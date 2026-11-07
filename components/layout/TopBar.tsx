import { Volume2, VolumeX } from 'lucide-react';

export function TopBar({
  balance,
  rounds,
  soundEnabled,
}: {
  balance: number;
  rounds: number[];
  soundEnabled: boolean;
}) {
  return (
    <header className="topbar">
      <div className="brand-wrap">
        <div className="brand-mark">G</div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">GoodTap</div>
          <div className="text-[11px] text-slate-600">Arcade rewards</div>
        </div>
      </div>

      <div className="topbar-balance">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">G$</span>
        <strong>{balance.toFixed(1)}</strong>
      </div>

      <div className="round-pips" aria-label="Daily rounds available">
        {rounds.map((round, index) => (
          <span key={`${round}-${index}`} className={`pip ${index < 3 ? 'filled' : ''}`} />
        ))}
      </div>

      <button className="icon-button" type="button" aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}>
        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </header>
  );
}
