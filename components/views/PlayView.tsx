'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Play, Zap } from 'lucide-react';
import { GameScreen } from '@/components/game/GameScreen';
import { TokenArt } from '@/components/game/TokenArt';
import type { TabId } from '@/components/shell/AppShell';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { UbiClaim } from '@/components/wallet/UbiClaim';
import { onChainMode } from '@/lib/chain/config';
import { useWalletStore } from '@/lib/chain/wallet-store';
import type { Skin } from '@/lib/game-rules';
import { useGameStore, type PlayMode } from '@/lib/game-store';
import { usePlayerStore } from '@/lib/player-store';
import { levelFromXp, useProgressStore } from '@/lib/progress-store';
import { toast } from '@/lib/toast-store';

// Treats falling through the hero, each on its own lane, speed and delay.
const RAIN: { skin: Skin; left: string; size: number; duration: number; delay: number }[] = [
  { skin: 'coin', left: '70%', size: 54, duration: 6, delay: 0 },
  { skin: 'golden', left: '84%', size: 40, duration: 7.5, delay: 2.4 },
  { skin: 'jelly-drop', left: '58%', size: 38, duration: 6.8, delay: 4.1 },
  { skin: 'candy', left: '88%', size: 44, duration: 8, delay: 1.2 },
  { skin: 'bubble', left: '64%', size: 36, duration: 7.2, delay: 5.6 },
];

const HOW_TO: { skin: Skin; label: string }[] = [
  { skin: 'coin', label: '+10' },
  { skin: 'jelly-cube', label: '+10' },
  { skin: 'golden', label: '+20' },
  { skin: 'rocket', label: 'Slow down' },
  { skin: 'bomb', label: 'Avoid' },
];

function Missions() {
  const { missions, ensureToday, claim } = useProgressStore();
  useEffect(() => {
    ensureToday();
  }, [ensureToday]);
  if (!missions.length) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Today’s missions</h2>
        <span className="muted num">{missions.filter((m) => m.claimed).length}/3</span>
      </div>
      {missions.map((mission) => {
        const done = mission.progress >= mission.goal;
        return (
          <div key={mission.id} className={`mission-row ${mission.claimed ? 'claimed' : ''}`}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mission-title">{mission.title}</div>
              <div className="meter" aria-hidden>
                <motion.span animate={{ width: `${(mission.progress / mission.goal) * 100}%` }} />
              </div>
            </div>
            {mission.claimed ? (
              <span className="mission-check" aria-label="Claimed">
                <Check size={16} strokeWidth={3} />
              </span>
            ) : done ? (
              <button
                type="button"
                className="btn btn-yellow btn-xs"
                onClick={() => {
                  const xp = claim(mission.id);
                  if (xp) toast.success(`+${xp} XP`, mission.title);
                }}
              >
                Claim
              </button>
            ) : (
              <span className="mission-xp num">+{mission.xp} XP</span>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function PlayView({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const player = usePlayerStore((s) => s.player);
  const status = useGameStore((s) => s.status);
  const startRound = useGameStore((s) => s.startRound);
  const exit = useGameStore((s) => s.exit);
  const account = useWalletStore((s) => s.account);
  const chainState = useWalletStore((s) => s.chainState);
  const rank = levelFromXp(useProgressStore((s) => s.xp));

  // On-chain the contract counts tournament games; otherwise the server does.
  const prizeLeft = onChainMode ? (chainState?.playsLeft ?? 0) : (player?.roundsLeft ?? 0);
  const busy = !player || status !== 'idle';

  const play = async (mode: PlayMode) => {
    try {
      await startRound(mode);
    } catch (error) {
      toast.error('Couldn’t start the game', error instanceof Error ? error.message : undefined);
      exit();
    }
  };

  return (
    <>
      <section className="home-hero">
        <div className="hero-glow" aria-hidden />
        {RAIN.map((drop) => (
          <motion.span
            key={drop.skin}
            className="hero-drop"
            style={{ left: drop.left, width: drop.size }}
            initial={{ y: -80, rotate: -10 }}
            animate={{ y: 380, rotate: 20 }}
            transition={{ repeat: Infinity, duration: drop.duration, delay: drop.delay, ease: 'linear' }}
            aria-hidden
          >
            <TokenArt skin={drop.skin} />
          </motion.span>
        ))}

        <p className="hero-kicker">
          <Zap size={13} fill="currentColor" /> Daily arcade on Celo
        </p>
        <h1 className="hero-title">
          Pop. Streak.
          <br />
          <span>Top the week.</span>
        </h1>
        <p className="hero-copy">Tap the treats before they fall. Free G$ every day, and G$ prizes for the week’s best scores.</p>

        <div className="hero-actions">
          {onChainMode && !account ? (
            <ConnectButton block label="Connect wallet to join the tournament" />
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block hero-play"
              onClick={() => play('prize')}
              disabled={busy || prizeLeft <= 0}
            >
              <Play size={20} fill="currentColor" strokeWidth={0} />
              {prizeLeft > 0 ? 'Tournament' : 'None left today'}
            </button>
          )}
          <button type="button" className="btn btn-dark btn-block" onClick={() => play('free')} disabled={busy}>
            Practice
          </button>
        </div>
        <p className="hero-meta">
          {onChainMode && account
            ? `${prizeLeft} tournament ${prizeLeft === 1 ? 'game' : 'games'} left today · tiny CELO network fee`
            : onChainMode
              ? 'Practice needs no wallet.'
              : `${prizeLeft} tournament ${prizeLeft === 1 ? 'game' : 'games'} left today`}
        </p>
      </section>

      <UbiClaim compact />

      <section className="stat-strip">
        <div>
          <span className="stat-label">Best</span>
          <strong className="num">{player ? player.bestScore.toLocaleString() : '–'}</strong>
        </div>
        <div>
          <span className="stat-label">This week</span>
          <strong className="num">{player ? player.weeklyBest.toLocaleString() : '–'}</strong>
        </div>
        <div>
          <span className="stat-label">Level</span>
          <strong className="num">{rank.level}</strong>
          <span className="meter thin" aria-hidden>
            <motion.span animate={{ width: `${(rank.into / rank.needed) * 100}%` }} />
          </span>
        </div>
      </section>

      <Missions />

      <section className="panel">
        <div className="panel-head">
          <h2>How to play</h2>
        </div>
        <div className="how-row">
          {HOW_TO.map((item) => (
            <div key={item.skin} className={`how-item ${item.skin === 'bomb' ? 'danger' : ''}`}>
              <span className="how-art">
                <TokenArt skin={item.skin} />
              </span>
              {item.label}
            </div>
          ))}
        </div>
        <p className="panel-copy">Pop treats before they hit the floor. Pop many in a row for bigger points.</p>
      </section>

      {status !== 'idle' && <GameScreen onViewRanks={() => onNavigate('ranks')} />}
    </>
  );
}
