'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Play } from 'lucide-react';
import { GameScreen } from '@/components/game/GameScreen';
import { TokenArt } from '@/components/game/TokenArt';
import type { TabId } from '@/components/shell/AppShell';
import { CeloGasHelp } from '@/components/wallet/CeloGasHelp';
import { UbiClaim } from '@/components/wallet/UbiClaim';
import { hasCeloForGas } from '@/lib/access';
import { useWalletStore } from '@/lib/chain/wallet-store';
import { useGameStore } from '@/lib/game-store';
import { usePlayerStore } from '@/lib/player-store';
import { levelFromXp, useProgressStore } from '@/lib/progress-store';
import { toast } from '@/lib/toast-store';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

type Skin = Parameters<typeof TokenArt>[0]['skin'];

// Falling treats in the hero
const RAIN: { skin: Skin; left: string; size: number; duration: number; delay: number }[] = [
  { skin: 'coin',      left: '72%', size: 52, duration: 6.0, delay: 0   },
  { skin: 'golden',    left: '84%', size: 38, duration: 7.5, delay: 2.4 },
  { skin: 'jelly-drop',left: '60%', size: 36, duration: 6.8, delay: 4.1 },
  { skin: 'candy',     left: '88%', size: 42, duration: 8.0, delay: 1.2 },
  { skin: 'bubble',    left: '65%', size: 34, duration: 7.2, delay: 5.6 },
];

const HOW_TO: { skin: Skin; label: string }[] = [
  { skin: 'coin',      label: '+10' },
  { skin: 'jelly-cube',label: '+10' },
  { skin: 'golden',    label: '+20' },
  { skin: 'rocket',    label: 'Slow down' },
  { skin: 'bomb',      label: 'Avoid' },
];

function Missions() {
  const { missions, ensureToday, claim } = useProgressStore();
  useEffect(() => { ensureToday(); }, [ensureToday]);
  if (!missions.length) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Today&apos;s missions</h2>
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
              <span className="mission-check" aria-label="Claimed"><Check size={16} strokeWidth={3} /></span>
            ) : done ? (
              <button type="button" className="btn btn-yellow btn-xs" onClick={() => {
                const xp = claim(mission.id);
                if (xp) toast.success(`+${xp} XP`, mission.title);
              }}>Claim</button>
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
  const refreshChain = useWalletStore((s) => s.refreshChain);
  const rank = levelFromXp(useProgressStore((s) => s.xp));

  // Refresh chain state on mount so the gas check is immediately accurate.
  useEffect(() => {
    if (account && !chainState) void refreshChain();
  }, [account, chainState, refreshChain]);

  const busy = !player || status !== 'idle';
  const canPlay = hasCeloForGas(chainState?.celoBalance);

  const play = async () => {
    try {
      // Always free mode — tournament is separate on the profile tab
      await startRound('free');
    } catch (error) {
      toast.error('Couldn\u2019t start the game', error instanceof Error ? error.message : undefined);
      exit();
    }
  };

  return (
    <>
      <section className="home-hero">
        <div className="hero-glow" aria-hidden />

        {/* Falling treats */}
        {RAIN.map((drop) => (
          <motion.span
            key={drop.skin}
            className="hero-drop"
            style={{ left: drop.left, width: drop.size }}
            initial={{ y: -80, rotate: -10 }}
            animate={{ y: 400, rotate: 20 }}
            transition={{ repeat: Infinity, duration: drop.duration, delay: drop.delay, ease: 'linear' }}
            aria-hidden
          >
            <TokenArt skin={drop.skin} />
          </motion.span>
        ))}

        <h1 className="hero-title">
          Pop. Streak.
          <br />
          <span>Top the week.</span>
        </h1>
        <p className="hero-copy">
          Tap the treats before they fall. Claim free G$ every day and climb the weekly board.
        </p>

        {!canPlay ? (
          <>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary btn-block hero-play" disabled>
                <Play size={20} fill="currentColor" strokeWidth={0} />
                Need CELO to play
              </button>
            </div>
            <CeloGasHelp />
          </>
        ) : (
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary btn-block hero-play"
              onClick={play}
              disabled={busy}
            >
              {busy && status !== 'idle' ? <span className="spinner" /> : <Play size={20} fill="currentColor" strokeWidth={0} />}
              Play
            </button>
          </div>
        )}
      </section>

      <InstallPrompt />
      <UbiClaim compact />

      <section className="stat-strip">
        <div>
          <span className="stat-label">Best</span>
          <strong className="num">{player ? player.bestScore.toLocaleString() : '\u2013'}</strong>
        </div>
        <div>
          <span className="stat-label">This week</span>
          <strong className="num">{player ? player.weeklyBest.toLocaleString() : '\u2013'}</strong>
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
        <div className="panel-head"><h2>How to play</h2></div>
        <div className="how-row">
          {HOW_TO.map((item) => (
            <div key={item.skin} className={`how-item ${item.skin === 'bomb' ? 'danger' : ''}`}>
              <span className="how-art"><TokenArt skin={item.skin} /></span>
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
