'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Copy, ExternalLink, Gamepad2, Gift, Share2, ShieldCheck, Users } from 'lucide-react';
import { isAddress, getAddress, type Address } from 'viem';
import { REFERRER_KEY } from '@/components/shell/AppShell';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { api } from '@/lib/api';
import { playSound } from '@/lib/audioManager';
import { onChainMode } from '@/lib/chain/config';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { formatG, shortAddress } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';
import { toast } from '@/lib/toast-store';
import { usePendingGameRewards } from '@/lib/use-economy';
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

export function RewardsView() {
  const player = usePlayerStore((s) => s.player);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const { account, chainState, claimDaily, claimRewards, setReferrer, refreshChain } = useWalletStore();
  const pendingGame = usePendingGameRewards();
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<Address | null>(null);

  useEffect(() => {
    if (account) void refreshChain();
  }, [account, refreshChain]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REFERRER_KEY);
      if (stored && isAddress(stored)) setInvite(getAddress(stored));
    } catch {
      // no storage, no remembered invite
    }
  }, []);

  const demo = player?.demo;
  const streak = onChainMode ? chainState?.streak ?? 0 : demo?.streak ?? 0;
  const claimedToday = onChainMode ? Boolean(chainState && !chainState.canClaimDaily && chainState.verified) : Boolean(demo?.claimedToday);
  const dailyAmount = onChainMode
    ? chainState?.dailyAmount ?? 0
    : DEMO_DAILY + DEMO_STREAK_BONUS * Math.min(claimedToday ? streak - 1 : streak, 7);
  const needsVerification = onChainMode && account && chainState && !chainState.verified;
  const canApplyInvite =
    onChainMode && account && invite && chainState && chainState.totalClaims === 0 && !chainState.referrer && invite.toLowerCase() !== account.toLowerCase();

  const onClaimDaily = async () => {
    setBusy(true);
    try {
      if (onChainMode) {
        const amount = await claimDaily();
        toast.success(`+${formatG(amount ?? 0)} G$ claimed`, 'Come back tomorrow for a bigger gift!');
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
      const amount = await claimRewards();
      playSound('golden-token', 1);
      toast.success(`+${formatG(amount ?? 0, 3)} G$ collected`, 'Your prizes are in your wallet.');
    } catch (error) {
      toast.error('Couldn’t collect your prizes', describeError(error));
    }
  };

  const onApplyInvite = async () => {
    if (!invite) return;
    try {
      await setReferrer(invite);
      toast.success('Invite accepted', 'Your friend gets a gift when you open your first daily gift.');
    } catch (error) {
      toast.error('Couldn’t accept the invite', describeError(error));
    }
  };

  const inviteLink = account && typeof window !== 'undefined' ? `${window.location.origin}/?ref=${account}` : null;

  const shareInvite = async () => {
    if (!inviteLink) return;
    const text = 'Play Xurri with me and win G$!';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Xurri', text, url: inviteLink });
      } else {
        await navigator.clipboard.writeText(inviteLink);
        toast.success('Invite link copied');
      }
    } catch {
      // user dismissed the share sheet
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
                Prizes are for real people. Do a quick face check in the GoodDollar app, then come back.
                <a href={GOODDOLLAR_VERIFY_URL} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm btn-block" style={{ marginTop: 10 }}>
                  Do the face check <ExternalLink size={15} />
                </a>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-gold btn-block" onClick={onClaimDaily} disabled={busy || claimedToday || !player}>
              {busy ? <span className="spinner" /> : claimedToday ? 'Claimed today ✓' : `Claim ${formatG(dailyAmount)} G$`}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row">
          <div>
            <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Gamepad2 size={12} /> Game prizes
            </p>
            <p className="title-md num" style={{ marginTop: 4 }}>
              {onChainMode ? `${formatG(pendingGame, 3)} G$ ready` : 'Added right away'}
            </p>
          </div>
          {onChainMode && account && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onCollect} disabled={pendingGame <= 0}>
              Collect
            </button>
          )}
        </div>
        <p className="copy" style={{ marginTop: 8, fontSize: '0.84rem' }}>
          Every 100 points wins 0.05 G$ (up to 1 G$ a game).{' '}
          {onChainMode
            ? `Won so far: ${formatG(player?.earned ?? 0, 3)} G$.`
            : 'They go straight into your balance.'}
        </p>
        {onChainMode && chainState && (
          <p className="copy" style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--faint)' }}>
            Prize pot: {formatG(chainState.pool, 0)} G$
          </p>
        )}
      </div>

      <div className="card">
        <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Users size={12} /> Invite friends
        </p>
        <p className="title-md" style={{ marginTop: 4 }}>
          {onChainMode && chainState?.referralBonus ? `Earn ${formatG(chainState.referralBonus)} G$ per friend` : 'Bring your crew'}
        </p>
        <p className="copy" style={{ marginTop: 6, fontSize: '0.84rem' }}>
          You get a gift when your friend opens their first daily gift.
        </p>

        {canApplyInvite && (
          <div className="notice" style={{ marginTop: 12 }}>
            <Gift size={18} />
            <div style={{ flex: 1 }}>
              {shortAddress(invite)} invited you! Accept so they get a thank-you gift.
              <button type="button" className="btn btn-primary btn-sm btn-block" style={{ marginTop: 10 }} onClick={onApplyInvite}>
                Accept invite
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          {inviteLink ? (
            <div className="code-box">
              <span>{inviteLink.replace(/^https?:\/\//, '')}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Copy invite link"
                onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success('Invite link copied'))}
              >
                <Copy size={16} />
              </button>
              <button type="button" className="icon-btn" aria-label="Share invite link" onClick={shareInvite}>
                <Share2 size={16} />
              </button>
            </div>
          ) : (
            <ConnectButton block label="Connect to get your invite link" />
          )}
        </div>
      </div>
    </>
  );
}
