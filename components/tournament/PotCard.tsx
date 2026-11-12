'use client';

import { useState } from 'react';
import { HeartHandshake, Plus } from 'lucide-react';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { api } from '@/lib/api';
import { playSound } from '@/lib/audioManager';
import { onChainMode } from '@/lib/chain/config';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { formatG } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';
import { toast } from '@/lib/toast-store';

const AMOUNTS = [5, 10, 25];
const UBI_SHARE = 0.1;

/** This week's community prize pot, and buttons to add G$ to it. */
export function PotCard({ total, boosted, onBoosted }: { total: number; boosted: number; onBoosted: () => void }) {
  const account = useWalletStore((s) => s.account);
  const boostPot = useWalletStore((s) => s.boostPot);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [pending, setPending] = useState<number | null>(null);

  const boost = async (amount: number) => {
    setPending(amount);
    try {
      if (onChainMode) await boostPot(amount);
      else setPlayer((await api.demoBoost(amount)).player);
      playSound('golden-token', 1);
      toast.success(
        `+${formatG(amount * (1 - UBI_SHARE))} G$ in the pot`,
        `Thanks! ${formatG(amount * UBI_SHARE)} G$ also went to GoodDollar’s UBI pool.`,
      );
      onBoosted();
    } catch (error) {
      toast.error('Couldn’t add to the pot', describeError(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="card pot-card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div>
          <p className="eyebrow">This week’s prize pot</p>
          <p className="title-xl num" style={{ marginTop: 2 }}>
            {formatG(total, 0)} G$
          </p>
          <p className="copy" style={{ fontSize: '0.84rem', marginTop: 2 }}>
            {boosted > 0 ? `${formatG(boosted, 0)} G$ added by players and sponsors` : 'Be the first to add to it this week'}
          </p>
        </div>
        <HeartHandshake size={34} color="var(--orange)" aria-hidden />
      </div>

      <p className="copy" style={{ fontSize: '0.84rem', marginTop: 12 }}>
        Add G$ and every prize this week grows. {UBI_SHARE * 100}% of it goes to GoodDollar’s UBI pool, which pays
        everyone’s free daily G$.
      </p>

      <div className="pot-actions">
        {onChainMode && !account ? (
          <ConnectButton block label="Connect to add G$" />
        ) : (
          AMOUNTS.map((amount) => (
            <button key={amount} type="button" className="btn btn-ghost btn-sm" disabled={pending !== null} onClick={() => boost(amount)}>
              {pending === amount ? <span className="spinner" /> : <Plus size={15} />} {amount} G$
            </button>
          ))
        )}
      </div>
    </div>
  );
}
