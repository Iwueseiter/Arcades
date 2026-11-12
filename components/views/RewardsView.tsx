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
        toast.success(`+${formatG(amount ?? 0)} G$ claimed`, 'See you tomorrow to keep the streak alive.');
      } else {
        const { amount, player: next } = await api.demoClaim();
        setPlayer(next);
        toast.success(`+${formatG(amount)} G$ claimed`, 'See you tomorrow to keep the streak alive.');
      }
      playSound('score-milestone', 1);
    } catch (error) {
      toast.error('Claim failed', describeError(error));
    } finally {
      setBusy(false);
    }
  };

  const onCollect = async () => {
    try {
      const amount = await claimRewards();
      playSound('golden-token', 1);
      toast.success(`+${formatG(amount ?? 0, 3)} G$ collected`, 'Game rewards are now in your wallet.');
    } catch (error) {
      toast.error('Couldn’t collect rewards', describeError(error));
    }
  };

  const onApplyInvite = async () => {
    if (!invite) return;
    try {
      await setReferrer(invite);
      toast.success('Invite applied', 'Your friend gets a bonus when you make your first daily claim.');
    } catch (error) {
      toast.error('Couldn’t apply invite', describeError(error));
    }
  };

  const inviteLink = account && typeof window !== 'undefined' ? `${window.location.origin}/?ref=${account}` : null;

  const shareInvite = async () => {
    if (!inviteLink) return;
    const text = 'Play GoodTap with me and earn G$ on Celo';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'GoodTap', text, url: inviteLink });
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
      <div className="card card-gold">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div>
            <p className="eyebrow">Daily check-in</p>
            <h1 className="title-xl">
              <span className="gold-text num">{formatG(dailyAmount)} G$</span>
            </h1>
            <p className="copy" style={{ marginTop: 4 }}>
              {streak > 0 ? `${streak}-day streak · +0.2 G$ per day in a row, up to 7` : 'Claim every day to grow a streak bonus.'}
            </p>
          </div>
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}>
            <Gift size={40} color="var(--gold)" />
          </motion.div>
        </div>

        <StreakTrack streak={streak} claimedToday={claimedToday} />

        <div style={{ marginTop: 16 }}>
          {onChainMode && !account ? (
            <ConnectButton block label="Connect to claim" />
          ) : needsVerification ? (
            <div className="notice warn">
              <ShieldCheck size={18} />
              <div>
                GoodDollar rewards are for verified humans. Verify once in the GoodDollar wallet with this address, then come back.
                <a href={GOODDOLLAR_VERIFY_URL} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm btn-block" style={{ marginTop: 10 }}>
                  Verify with GoodDollar <ExternalLink size={15} />
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
              <Gamepad2 size={12} /> Game rewards
            </p>
            <p className="title-md num" style={{ marginTop: 4 }}>
              {onChainMode ? `${formatG(pendingGame, 3)} G$ ready` : 'Paid instantly'}
            </p>
          </div>
          {onChainMode && account && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onCollect} disabled={pendingGame <= 0}>
              Collect
            </button>
          )}
        </div>
        <p className="copy" style={{ marginTop: 8, fontSize: '0.84rem' }}>
          Ranked rounds pay 0.05 G$ per 100 points, up to 1 G$ a round.{' '}
          {onChainMode
            ? `Lifetime earned: ${formatG(player?.earned ?? 0, 3)} G$.`
            : 'In demo mode they land straight in your balance.'}
        </p>
        {onChainMode && chainState && (
          <p className="copy" style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--faint)' }}>
            Reward pool: {formatG(chainState.pool, 0)} G$
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
          You get the bonus when a friend you invite makes their first daily claim.
        </p>

        {canApplyInvite && (
          <div className="notice" style={{ marginTop: 12 }}>
            <Gift size={18} />
            <div style={{ flex: 1 }}>
              You were invited by {shortAddress(invite)}. Apply it before your first claim so they get the bonus.
              <button type="button" className="btn btn-primary btn-sm btn-block" style={{ marginTop: 10 }} onClick={onApplyInvite}>
                Apply invite
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
