'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Play } from 'lucide-react';
import { GameScreen } from '@/components/game/GameScreen';
import { Mascot } from '@/components/game/Mascot';
import { TokenArt } from '@/components/game/TokenArt';
import type { TabId } from '@/components/shell/AppShell';
import type { Skin } from '@/lib/game-rules';
import { useGameStore } from '@/lib/game-store';
import { usePlayerStore } from '@/lib/player-store';
import { levelFromXp, useProgressStore } from '@/lib/progress-store';
import { toast } from '@/lib/toast-store';

// Treats drifting around the hero, positioned by hand so the scene feels composed rather than random.
const FLOATERS: { skin: Skin; left: string; top: string; size: number; delay: number }[] = [
  { skin: 'coin', left: '8%', top: '18%', size: 46, delay: 0 },
  { skin: 'jelly-drop', left: '78%', top: '12%', size: 42, delay: 0.6 },
  { skin: 'bubble', left: '84%', top: '48%', size: 38, delay: 1.2 },
  { skin: 'candy', left: '4%', top: '56%', size: 44, delay: 0.3 },
  { skin: 'golden', left: '66%', top: '30%', size: 34, delay: 0.9 },
  { skin: 'jelly-cube', left: '22%', top: '6%', size: 34, delay: 1.5 },
];

const GREETINGS = ['Ready to pop some treats?', 'Let’s get a sweet streak!', 'I’m hungry for a high score!'];

const HOW_TO: { skin: Skin; label: string }[] = [
  { skin: 'coin', label: 'Tap' },
  { skin: 'jelly-drop', label: 'Tap' },
  { skin: 'golden', label: 'x2 pts' },
  { skin: 'rocket', label: 'Slow down' },
  { skin: 'bomb', label: 'Avoid!' },
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
  const rank = levelFromXp(useProgressStore((s) => s.xp));
  const roundsLeft = player?.roundsLeft ?? 0;
  const greeting = GREETINGS[new Date().getDate() % GREETINGS.length];

  const play = async () => {
    try {
      await startRound();
    } catch (error) {
      toast.error('Couldn’t start the game', error instanceof Error ? error.message : undefined);
      exit();
    }
  };

  return (
    <>
      <section className="home-hero">
        <div className="hero-sun" aria-hidden />
        <div className="hero-cloud c1" aria-hidden />
        <div className="hero-cloud c2" aria-hidden />
        {FLOATERS.map((f) => (
          <motion.span
            key={f.skin}
            className="hero-treat"
            style={{ left: f.left, top: f.top, width: f.size }}
            animate={{ y: [0, -8, 0], rotate: [-6, 6, -6] }}
            transition={{ repeat: Infinity, duration: 3.2, delay: f.delay, ease: 'easeInOut' }}
            aria-hidden
          >
            <TokenArt skin={f.skin} />
          </motion.span>
        ))}

        <div className="hero-mascot">
          <Mascot mood="happy" line={greeting} at={1} size={112} side="right" />
        </div>

        <h1 className="hero-title">
          Pop the <span>treats!</span>
        </h1>

        <motion.button
          type="button"
          className="play-btn"
          onClick={play}
          disabled={!player || status !== 'idle'}
          whileTap={{ scale: 0.97 }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <Play size={30} fill="currentColor" strokeWidth={0} />
          PLAY
        </motion.button>
        <p className="hero-sub">{roundsLeft > 0 ? `${roundsLeft} prize ${roundsLeft === 1 ? 'game' : 'games'} left today` : 'Free play · more prize games tomorrow'}</p>
      </section>

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
        <p className="panel-copy">Pop treats before they hit the floor. Pop many in a row for bigger points!</p>
      </section>

      {status !== 'idle' && <GameScreen onViewRanks={() => onNavigate('ranks')} />}
    </>
  );
}
