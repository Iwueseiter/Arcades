'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Play, Share2, Target, Timer, Trophy, Zap } from 'lucide-react';
import { GameScreen } from '@/components/game/GameScreen';
import { MergeScreen } from '@/components/merge/MergeScreen';
import { TierArt, tierStyle } from '@/components/merge/TierArt';
import { Mascot } from '@/components/game/Mascot';
import { TokenArt } from '@/components/game/TokenArt';
import type { TabId } from '@/components/shell/AppShell';
import { WORLDS } from '@/lib/game-rules';
import { formatDuration } from '@/lib/format';
import { useGameStore } from '@/lib/game-store';
import { tierInfo } from '@/lib/merge-engine';
import { useMergeStore } from '@/lib/merge-store';
import { usePlayerStore } from '@/lib/player-store';
import { levelFromXp, useProgressStore } from '@/lib/progress-store';
import { toast } from '@/lib/toast-store';

const LEGEND = [
  { skin: 'coin', label: 'Coin +10' },
  { skin: 'jelly-cube', label: 'Jelly +10' },
  { skin: 'bubble', label: 'Bubble +10' },
  { skin: 'golden', label: 'Star +20' },
  { skin: 'rocket', label: 'Slow-mo' },
  { skin: 'bomb', label: 'Avoid!' },
] as const;

const GREETINGS = ['Ready to pop some treats?', 'I’m hungry for a high score!', 'Let’s hit fever mode today!'];

/** The featured daily puzzle: same board for everyone, one ranked attempt a day. */
function MergeCard() {
  const { today, loadToday, startDaily, startPractice, status } = useMergeStore();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  const run = today?.run ?? null;
  const finished = run?.status === 'finished' ? run : null;

  const playDaily = async () => {
    setBusy(true);
    try {
      await startDaily();
    } catch (error) {
      toast.error('Couldn’t open today’s puzzle', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="merge-card">
      <div className="merge-card-art" aria-hidden>
        {[1, 3, 5, 7].map((tier, i) => (
          <motion.div
            key={tier}
            className="merge-card-tile"
            style={{ background: tierStyle(tier).bg }}
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.2 }}
          >
            <TierArt tier={tier} />
          </motion.div>
        ))}
      </div>
      <div className="merge-card-body">
        <span className="badge badge-gold">NEW · Daily puzzle {today ? `#${today.number}` : ''}</span>
        <h2 className="title-md" style={{ fontSize: '1.7rem', marginTop: 6 }}>
          Jelly Merge
        </h2>
        <p className="copy" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          {finished
            ? `You scored ${finished.score.toLocaleString()} · #${finished.rank} today · best jelly: ${tierInfo(finished.maxTier).name}`
            : 'Same board for everyone today. One ranked try. Merge your way to the Rainbow Bloop!'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {finished ? (
            <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled>
              <Timer size={16} /> Next in {formatDuration(today?.resetsInMs ?? 0)}
            </button>
          ) : (
            <button type="button" className="btn btn-gold btn-sm" style={{ flex: 1.4 }} onClick={playDaily} disabled={busy || status !== 'idle'}>
              {busy ? <span className="spinner" /> : <Play size={16} fill="currentColor" />}
              {run?.status === 'active' ? 'Resume puzzle' : 'Play today’s puzzle'}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={startPractice} disabled={status !== 'idle'}>
            Practice
          </button>
        </div>
        {finished && (
          <p className="copy" style={{ fontSize: '0.72rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Share2 size={12} /> Share your result from the results screen to challenge friends.
          </p>
        )}
      </div>
    </div>
  );
}

function Missions() {
  const { missions, ensureToday, claim } = useProgressStore();

  useEffect(() => {
    ensureToday();
  }, [ensureToday]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={12} /> Daily missions
        </p>
        <span className="badge">{missions.filter((m) => m.claimed).length}/3 done</span>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {missions.map((mission) => {
          const done = mission.progress >= mission.goal;
          return (
            <div key={mission.id} className={`mission ${done ? 'done' : ''} ${mission.claimed ? 'claimed' : ''}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mission-title">{mission.title}</div>
                <div className="mission-bar" aria-hidden>
                  <motion.span animate={{ width: `${(mission.progress / mission.goal) * 100}%` }} />
                </div>
                <div className="mission-meta num">
                  {Math.min(mission.progress, mission.goal)} / {mission.goal}
                </div>
              </div>
              {mission.claimed ? (
                <span className="mission-check">
                  <Check size={18} />
                </span>
              ) : !done ? (
                <span className="mission-xp">+{mission.xp} XP</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={() => {
                    const xp = claim(mission.id);
                    if (xp) toast.success(`+${xp} XP`, mission.title);
                  }}
                >
                  Claim
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlayView({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const player = usePlayerStore((s) => s.player);
  const status = useGameStore((s) => s.status);
  const startRound = useGameStore((s) => s.startRound);
  const exit = useGameStore((s) => s.exit);
  const xp = useProgressStore((s) => s.xp);
  const rank = levelFromXp(xp);
  const greeting = GREETINGS[new Date().getDate() % GREETINGS.length];
  const roundsLeft = player?.roundsLeft ?? 0;
  const mergeStatus = useMergeStore((s) => s.status);

  const play = async () => {
    try {
      await startRound();
    } catch (error) {
      toast.error('Round didn’t start', error instanceof Error ? error.message : undefined);
      exit();
    }
  };

  return (
    <>
      <div className="card card-hero lobby-hero">
        <div className="lobby-top">
          <div className="lobby-mascot">
            <Mascot mood="happy" line={greeting} at={1} size={104} side="right" />
          </div>
        </div>

        <div className="lobby-rank">
          <span className="lobby-rank-badge">{rank.level}</span>
          <div style={{ flex: 1 }}>
            <div className="row" style={{ fontSize: '0.78rem', fontWeight: 800 }}>
              <span>{player?.name ? player.name : 'Player'} · level {rank.level}</span>
              <span className="num" style={{ color: 'var(--muted)' }}>
                {rank.into}/{rank.needed} XP
              </span>
            </div>
            <div className="xp-bar" aria-hidden>
              <motion.span animate={{ width: `${(rank.into / rank.needed) * 100}%` }} />
            </div>
          </div>
        </div>

        <MergeCard />

        <motion.button
          type="button"
          className="play-button"
          onClick={play}
          disabled={!player || status !== 'idle'}
          whileTap={{ scale: 0.96 }}
        >
          <Play size={26} fill="currentColor" />
          <span>
            TREAT RUSH
            <small>{roundsLeft > 0 ? `Arcade · ${roundsLeft} ranked ${roundsLeft === 1 ? 'round' : 'rounds'} left today` : 'Arcade · practice mode'}</small>
          </span>
        </motion.button>

        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div className="stat">
            <p className="eyebrow" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Trophy size={11} /> Best
            </p>
            <div className="stat-value num">{player ? player.bestScore.toLocaleString() : '–'}</div>
          </div>
          <div className="stat">
            <p className="eyebrow" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Flame size={11} /> Week
            </p>
            <div className="stat-value num">{player ? player.weeklyBest.toLocaleString() : '–'}</div>
          </div>
          <div className="stat">
            <p className="eyebrow" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Zap size={11} /> Rounds
            </p>
            <div className="stat-value num">{player ? `${player.roundsLeft}/${player.maxRounds}` : '–'}</div>
          </div>
        </div>
      </div>

      <Missions />

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          Worlds
        </p>
        <div className="worlds">
          {WORLDS.map((world, i) => (
            <div key={world.id} className={`world-chip world-${world.id}`}>
              <span className="world-level">Lv {i + 1}</span>
              <strong>{world.name}</strong>
            </div>
          ))}
        </div>
        <p className="copy" style={{ marginTop: 10, fontSize: '0.8rem' }}>
          Score points to level up mid-round. Each level takes you to a new world with its own treats, and it loops back harder.
        </p>
      </div>

      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          How to play
        </p>
        <div className="legend">
          {LEGEND.map((item) => (
            <div key={item.skin} className="legend-item">
              <TokenArt skin={item.skin} />
              {item.label}
            </div>
          ))}
        </div>
        <p className="copy" style={{ marginTop: 12, fontSize: '0.82rem' }}>
          Tap coins, jellies, bubbles and candies before they reach the floor. Each one that lands costs a life. Chain catches to reach x2 at
          10, x3 at 25 and fever mode at x3+.
        </p>
      </div>

      {status !== 'idle' && <GameScreen onViewRanks={() => onNavigate('ranks')} />}
      {mergeStatus !== 'idle' && <MergeScreen onViewRanks={() => onNavigate('ranks')} />}
    </>
  );
}
