'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, ExternalLink, Gift, ShieldCheck, Trophy } from 'lucide-react';
import type { TabId } from '@/components/shell/AppShell';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { api } from '@/lib/api';
import { playSound } from '@/lib/audioManager';
import { onChainMode, tournamentsEnabled } from '@/lib/chain/config';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { formatG } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';
import { toast } from '@/lib/toast-store';
import { usePendingPrizes } from '@/lib/use-economy';
import { UbiClaim } from '@/components/wallet/UbiClaim';

const DEMO_DAILY = 1;
const DEMO_STREAK_BONUS = 0.2;
const GOODDOLLAR_VERIFY_URL = 'https://wallet.gooddollar.org';

function StreakTrack({ streak, claimedToday }: { streak: number; claimedToday: boolean }) {
  // Show the current week of the streak: day 8 starts a fresh row of 7.
  const offset = Math.floor(Math.max(0, claimedToday ? streak - 1 : streak) / 7) * 7;
  return (
    <div className="streak-track">
      {Array.from({ length: 7 }, (_, i) => {
        const day = offset + i + 1;
        const done = day <= streak;
        const next = !claimedToday && day === streak + 1;
        return (
          <div key={day} className={`streak-day ${done ? 'done' : ''} ${next ? 'next' : ''}`}>
            <Coins size={14} />
            Day {day}
          </div>
        );
      })}
    </div>
  );
}

export function RewardsView({ onNavigate }: { onNavigate?: (tab: TabId) => void }) {
  const player = usePlayerStore((s) => s.player);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const { account, chainState, claimDaily, claimPrizes, refreshChain } = useWalletStore();
  const pendingGame = usePendingPrizes();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account) void refreshChain();
  }, [account, refreshChain]);

  const demo = player?.demo;
  const streak = onChainMode ? chainState?.streak ?? 0 : demo?.streak ?? 0;
  const claimedToday = onChainMode ? Boolean(chainState?.verified && !chainState.canClaimDaily) : Boolean(demo?.claimedToday);
  const dailyAmount = onChainMode
    ? chainState?.dailyAmount || DEMO_DAILY
    : DEMO_DAILY + DEMO_STREAK_BONUS * Math.min(claimedToday ? streak - 1 : streak, 7);
  const needsVerification = Boolean(onChainMode && account && chainState && !chainState.verified);
  const giftUnavailable = Boolean(onChainMode && chainState?.verified && !chainState.canClaimDaily);
  const onClaimDaily = async () => {
    setBusy(true);
    try {
      if (onChainMode) {
        const amount = await claimDaily();
        if (amount == null) throw new Error('Connect a verified wallet to claim G$.');
        toast.success(`+${formatG(amount)} G$ claimed`, 'Come back tomorrow for a bigger gift!');
      } else {
        const { amount, player: next } = await api.demoClaim();
        setPlayer(next);
        toast.success(`+${formatG(amount)} G$ claimed`, 'Come back tomorrow for a bigger gift!');
      }
      playSound('score-milestone', 1);
    } catch (error) {
      toast.error('Couldn’t open your gift', describeError(error));
    } finally {
      setBusy(false);
    }
  };

  const onCollect = async () => {
    try {
      const amount = await claimPrizes();
      if (amount == null) throw new Error('Connect your wallet to collect prizes.');
      playSound('golden-token', 1);
      toast.success(`+${formatG(amount, 3)} G$ collected`, 'Your tournament prizes are in your wallet.');
    } catch (error) {
      toast.error('Couldn’t collect your prizes', describeError(error));
    }
  };

  return (
    <>
      <UbiClaim />

      <div className="card card-gold">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div>
            <p className="eyebrow">Xurri daily gift</p>
            <h1 className="title-xl">
              <span className="gold-text num">{formatG(dailyAmount)} G$</span>
            </h1>
            <p className="copy" style={{ marginTop: 4 }}>
              {streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'} in a row! Come back tomorrow for more.` : 'Come back every day and your gift gets bigger.'}
            </p>
          </div>
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}>
            <Gift size={40} color="var(--gold)" />
          </motion.div>
        </div>

        <StreakTrack streak={streak} claimedToday={claimedToday} />

        <div style={{ marginTop: 16 }}>
          {onChainMode && !account ? (
            <ConnectButton block label="Connect to open your gift" />
          ) : needsVerification ? (
            <div className="notice warn">
              <ShieldCheck size={18} />
              <div>
                The daily gift is for real people. Do a quick face check in the GoodDollar app, then come back.
                <a href={GOODDOLLAR_VERIFY_URL} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm btn-block" style={{ marginTop: 10 }}>
                  Do the face check <ExternalLink size={15} />
                </a>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-gold btn-block"
              onClick={onClaimDaily}
              disabled={busy || claimedToday || giftUnavailable || !player}
            >
              {busy ? (
                <span className="spinner" />
              ) : giftUnavailable ? (
                'Not available right now'
              ) : claimedToday ? (
                'Claimed today ✓'
              ) : (
                `Claim ${formatG(dailyAmount)} G$`
              )}
            </button>
          )}
        </div>
      </div>

      {tournamentsEnabled && (
        <div className="card">
          <div className="row">
            <div>
              <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trophy size={12} /> Weekly tournament
              </p>
              <p className="title-md num" style={{ marginTop: 4 }}>
                {onChainMode ? `${formatG(pendingGame, 3)} G$ won, ready to collect` : 'Prizes go straight to your balance'}
              </p>
            </div>
            {onChainMode && account && (
              <button type="button" className="btn btn-primary btn-sm" onClick={onCollect} disabled={pendingGame <= 0}>
                Collect
              </button>
            )}
          </div>
          <p className="copy" style={{ marginTop: 8, fontSize: '0.84rem' }}>
            The best scores of the week win G$. The board closes Monday, and prizes arrive a day later, once we’ve checked
            the scores are fair.
            {onChainMode && player && player.earned > 0 ? ` Won so far: ${formatG(player.earned, 3)} G$.` : ''}
          </p>
          {onNavigate && (
            <button type="button" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 12 }} onClick={() => onNavigate('ranks')}>
              See this week’s prizes
            </button>
          )}
        </div>
      )}
    </>
  );
}
