'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, ExternalLink, Gift } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { playSound } from '@/lib/audioManager';
import { chainConfig } from '@/lib/chain/config';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { formatDuration, formatG } from '@/lib/format';
import { toast } from '@/lib/toast-store';

const GOODDOLLAR_APP = 'https://wallet.gooddollar.org';

/**
 * GoodDollar's own daily claim (UBI). Verified people get free G$ every day from GoodDollar's
 * UBIScheme contract; Xurri just gives them a button for it. The player pays a tiny CELO network fee.
 */
export function UbiClaim({ compact = false }: { compact?: boolean }) {
  const { account, ubi, ubiChecked, claimUbi, refreshUbi, busy } = useWalletStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (account) void refreshUbi();
  }, [account, refreshUbi]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Hide on networks without GoodDollar's contracts, or when they can't be reached.
  if (!chainConfig.ubiAddress || (account && !ubi && ubiChecked)) return null;

  const claim = async () => {
    try {
      const amount = await claimUbi();
      if (amount == null) throw new Error('Connect a verified wallet to claim G$.');
      playSound('score-milestone', 1);
      toast.success(`+${formatG(amount)} G$ claimed`, 'Your free GoodDollar is in your wallet. Come back tomorrow for more.');
    } catch (error) {
      toast.error('Couldn’t claim', describeError(error));
    }
  };

  // The home screen only shows the strip when there's something to claim right now.
  if (compact) {
    if (!account || !ubi || !ubi.verified || ubi.claimedToday) return null;
    return (
      <button type="button" className="ubi-strip" onClick={claim} disabled={Boolean(busy)}>
        <span className="ubi-strip-icon">
          <Gift size={18} />
        </span>
        <span style={{ flex: 1, textAlign: 'left' }}>
          <strong>Your free G$ is ready</strong>
          <small>{formatG(ubi.amount)} G$ from GoodDollar</small>
        </span>
        <span className="ubi-strip-cta">Claim</span>
      </button>
    );
  }

  return (
    <section className="panel ubi-card">
      <div className="ubi-head">
        <span className="ubi-badge">G$</span>
        <div>
          <p className="eyebrow">GoodDollar daily claim</p>
          <h2 className="title-md">Free G$, every day</h2>
        </div>
      </div>

      {!account ? (
        <>
          <p className="panel-copy">Every verified person can claim free G$ from GoodDollar once a day. Connect your wallet to claim it here.</p>
          <div style={{ marginTop: 14 }}>
            <ConnectButton block label="Connect wallet" />
          </div>
        </>
      ) : !ubi ? (
        <div className="skeleton" style={{ height: 52, marginTop: 14 }} />
      ) : !ubi.verified ? (
        <>
          <p className="panel-copy">GoodDollar gives free G$ to real people. Do a one-time face check in the GoodDollar app with this wallet, then come back to claim.</p>
          <p style={{ margin: '10px 0 0', fontSize: '0.85rem' }}>
            <Link href="/gooddollar-verification" style={{ color: 'var(--orange)', fontWeight: 700 }}>
              How face verification works
            </Link>
          </p>
          <a className="btn btn-primary btn-block" style={{ marginTop: 14 }} href={GOODDOLLAR_APP} target="_blank" rel="noreferrer">
            Get verified <ExternalLink size={16} />
          </a>
        </>
      ) : ubi.claimedToday ? (
        <p className="ubi-done">
          <BadgeCheck size={18} /> Claimed today · next claim in {formatDuration(ubi.nextClaimAt - now)}
        </p>
      ) : (
        <>
          <p className="ubi-amount num">
            {formatG(ubi.amount)} <span>G$ waiting for you</span>
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={claim} disabled={Boolean(busy)}>
            Claim free G$
          </button>
          <p className="ubi-note">Paid by GoodDollar. You only pay a tiny CELO network fee.</p>
        </>
      )}
    </section>
  );
}
