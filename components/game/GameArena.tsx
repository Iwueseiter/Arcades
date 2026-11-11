'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Rocket, Trophy } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { SKIN_COLORS, TokenArt } from '@/components/game/TokenArt';
import { onChainMode } from '@/lib/chain/config';
import { formatG } from '@/lib/format';
import { ARENA_HEIGHT, ARENA_WIDTH, STARTING_LIVES, nextStreakThreshold, swayX } from '@/lib/game-rules';
import { useGameStore, type Pop } from '@/lib/game-store';
import { usePlayerStore } from '@/lib/player-store';
import { toast } from '@/lib/toast-store';

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

/** The tap effect: the token swells and vanishes, a ring expands and particles fly, styled per skin. */
function PopEffect({ pop }: { pop: Pop }) {
  if (pop.kind === 'miss' || !pop.skin) return null;
  const colors = SKIN_COLORS[pop.skin];
  const size = pop.size ?? 46;
  const isJelly = pop.skin === 'jelly-drop' || pop.skin === 'jelly-cube';
  const isBubble = pop.skin === 'bubble';
  const sparkly = pop.skin === 'golden' || pop.skin === 'coin';
  const count = pop.skin === 'golden' ? 18 : isJelly ? 10 : 14;
  const left = pct(pop.x, ARENA_WIDTH);
  const top = pct(pop.y, ARENA_HEIGHT);

  return (
    <>
      <motion.div
        className="pop-ghost"
        style={{ left, top, width: pct(size, ARENA_WIDTH) }}
        initial={{ scale: 1, opacity: 1 }}
        animate={isJelly ? { scaleX: [1, 1.5, 1.7], scaleY: [1, 0.55, 0.3], opacity: [1, 0.9, 0] } : { scale: isBubble ? 1.45 : 1.6, opacity: 0, rotate: sparkly ? 25 : 0 }}
        transition={{ duration: isBubble ? 0.16 : 0.32, ease: 'easeOut' }}
      >
        <TokenArt skin={pop.skin} />
      </motion.div>
      <motion.span
        className="pop-flash"
        style={{ left, top, width: size * 1.4, height: size * 1.4, background: `radial-gradient(circle, #ffffff, ${colors[0]}00 70%)` }}
        initial={{ scale: 0.4, opacity: 1 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
      <motion.span
        className="pop-ring"
        style={{ left, top, width: size, height: size, borderColor: colors[0] }}
        initial={{ scale: 0.6, opacity: 0.9 }}
        animate={{ scale: isBubble ? 2.4 : 2, opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.3;
        const distance = (isJelly ? 42 : 56) + (i % 3) * 14;
        const dot = isJelly ? 16 - (i % 3) * 3 : isBubble ? 7 : 10;
        return (
          <motion.span
            key={i}
            className={sparkly ? 'burst sparkle' : 'burst'}
            style={{ left, top, width: dot, height: dot, background: colors[i % colors.length], marginLeft: -dot / 2, marginTop: -dot / 2 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + (isJelly ? 18 : 0),
              opacity: 0,
              scale: isJelly ? [1, 1.2, 0.6] : 0.3,
              rotate: sparkly ? 180 : 0,
            }}
            transition={{ duration: isJelly ? 0.55 : 0.5, ease: 'easeOut' }}
          />
        );
      })}
    </>
  );
}

// Fixed positions so the twinkles don't jump between renders.
const SPARKLES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37 + 11) % 96}%`,
  top: `${(i * 53 + 7) % 92}%`,
  size: 6 + (i % 4) * 3,
  delay: `${-(i * 0.43) % 3}s`,
}));

const BOKEH = [
  { left: '12%', top: '18%', size: 90, color: 'rgba(255,95,174,0.35)', delay: 0 },
  { left: '78%', top: '12%', size: 70, color: 'rgba(91,124,255,0.4)', delay: -3 },
  { left: '64%', top: '58%', size: 110, color: 'rgba(155,107,255,0.35)', delay: -6 },
  { left: '20%', top: '72%', size: 80, color: 'rgba(62,232,181,0.25)', delay: -2 },
  { left: '45%', top: '35%', size: 60, color: 'rgba(255,201,74,0.22)', delay: -5 },
];

export function GameArena({ onViewRanks }: { onViewRanks: () => void }) {
  const game = useGameStore(
    useShallow((s) => ({
      status: s.status,
      score: s.score,
      lives: s.lives,
      streak: s.streak,
      multiplier: s.multiplier,
      tokens: s.tokens,
      pops: s.pops,
      banner: s.banner,
      shake: s.shake,
      slowmoUntil: s.slowmoUntil,
      startedAt: s.startedAt,
      countdown: s.countdown,
      ranked: s.ranked,
      result: s.result,
    })),
  );
  const { startRound, tick, tapToken } = useGameStore.getState();
  const player = usePlayerStore((s) => s.player);
  const arenaRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(0);

  // Game loop runs only while a round is live.
  useEffect(() => {
    if (game.status !== 'playing') return;
    let frame = 0;
    let last = performance.now();
    const step = (time: number) => {
      tick(time - last, time);
      setNow(time);
      last = time;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [game.status, tick]);

  useEffect(() => {
    const el = arenaRef.current;
    if (!el || !game.shake) return;
    el.classList.remove('shake');
    void el.offsetWidth; // restart the animation
    el.classList.add('shake');
  }, [game.shake]);

  const begin = async () => {
    try {
      await startRound();
    } catch (error) {
      toast.error('Round didn’t start', error instanceof Error ? error.message : undefined);
    }
  };

  const slowmo = game.status === 'playing' && now - game.startedAt < game.slowmoUntil;
  const threshold = nextStreakThreshold(game.streak);
  const comboProgress = threshold ? (game.streak / threshold) * 100 : 100;
  const roundsLeft = player?.roundsLeft ?? 0;
  const result = game.result;

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="hud">
        <div>
          <p className="eyebrow">{game.ranked || game.status === 'idle' ? 'Score' : 'Practice'}</p>
          <div className="hud-score num">{game.score.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="hearts" aria-label={`${game.lives} lives left`}>
            {Array.from({ length: STARTING_LIVES }, (_, i) => (
              <motion.span key={i} animate={{ scale: i < game.lives ? 1 : 0.8, opacity: i < game.lives ? 1 : 0.3 }}>
                <Heart size={22} fill={i < game.lives ? 'var(--coral)' : 'transparent'} color="var(--coral)" />
              </motion.span>
            ))}
          </div>
          {slowmo && (
            <span className="badge badge-mint" style={{ marginTop: 6 }}>
              <Rocket size={12} /> Slow-mo
            </span>
          )}
        </div>
      </div>

      <div className="combo">
        <div className="combo-track" aria-hidden>
          <div className="combo-fill" style={{ width: `${Math.min(comboProgress, 100)}%` }} />
        </div>
        <motion.div key={game.multiplier} className="combo-mult" initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
          x{game.multiplier}
        </motion.div>
      </div>

      <div
        ref={arenaRef}
        className={`arena ${slowmo ? 'slowmo' : ''} ${game.status === 'playing' && game.multiplier >= 3 ? 'fever' : ''}`}
        aria-label="Game arena"
      >
        <div className="bokeh" aria-hidden>
          {BOKEH.map((b, i) => (
            <span key={i} style={{ left: b.left, top: b.top, width: b.size, height: b.size, background: b.color, animationDelay: `${b.delay}s` }} />
          ))}
        </div>
        <div className="sparkles" aria-hidden>
          {SPARKLES.map((star, i) => (
            <span key={i} style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }} />
          ))}
        </div>
        {game.tokens.map((token) => (
          <button
            key={token.id}
            type="button"
            className={`token ${token.type} skin-${token.skin}`}
            style={{
              left: pct(swayX(token), ARENA_WIDTH),
              top: pct(token.y, ARENA_HEIGHT),
              width: pct(token.radius * 2, ARENA_WIDTH),
              aspectRatio: '1',
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              tapToken(token.id);
            }}
            aria-label={`${token.type} token`}
          >
            <TokenArt skin={token.skin} />
          </button>
        ))}

        <AnimatePresence>
          {game.pops.map((pop) => (
            <motion.div key={pop.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} exit={{ opacity: 0 }}>
              <PopEffect pop={pop} />
              <motion.span
                className={`pop ${pop.kind}`}
                style={{ left: pct(pop.x, ARENA_WIDTH), top: pct(pop.y, ARENA_HEIGHT) }}
                initial={{ y: 0, opacity: 1, scale: 0.7 }}
                animate={{ y: -46, opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
              >
                {pop.label}
              </motion.span>
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {game.banner && game.status === 'playing' && (
            <motion.div
              key={game.banner}
              className="banner"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            >
              {game.banner}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {game.status !== 'playing' && (
            <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {game.status === 'countdown' ? (
                <motion.div
                  key={game.countdown}
                  className="countdown"
                  initial={{ scale: 1.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                >
                  {game.countdown}
                </motion.div>
              ) : game.status === 'starting' || game.status === 'submitting' ? (
                <div className="overlay-panel">
                  <div className="spinner" style={{ margin: '0 auto 12px', width: 30, height: 30, color: 'var(--violet)' }} />
                  <p className="title-md">{game.status === 'starting' ? 'Loading round…' : 'Checking your score…'}</p>
                </div>
              ) : game.status === 'ended' && result ? (
                <motion.div className="overlay-panel" initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }}>
                  <p className="eyebrow">{result.ranked ? 'Ranked round' : 'Practice round'}</p>
                  <div className="title-xl num" style={{ fontSize: '3rem' }}>
                    {result.score.toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '10px 0 16px' }}>
                    {result.newBest && (
                      <span className="badge badge-gold">
                        <Trophy size={12} /> New best!
                      </span>
                    )}
                    {result.reward > 0 && <span className="badge badge-mint">+{formatG(result.reward, 3)} G$ earned</span>}
                    {result.ranked && result.reward === 0 && onChainMode && !player?.address && (
                      <span className="badge">Connect a wallet to earn G$</span>
                    )}
                    {result.offline && <span className="badge badge-coral">Not saved: offline</span>}
                    {result.rejected && <span className="badge badge-coral">Score not accepted</span>}
                  </div>
                  <button type="button" className="btn btn-primary btn-block" onClick={begin}>
                    {roundsLeft > 0 ? `Play again · ${roundsLeft} left` : 'Practice again'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={onViewRanks}>
                    See the leaderboard
                  </button>
                </motion.div>
              ) : (
                <motion.div className="overlay-panel" initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
                  <p className="eyebrow">{roundsLeft > 0 ? `${roundsLeft} ranked rounds left today` : 'Ranked rounds used'}</p>
                  <p className="title-md" style={{ margin: '6px 0 4px', fontSize: '1.6rem' }}>
                    Ready to tap?
                  </p>
                  <p className="copy" style={{ marginBottom: 16 }}>
                    {roundsLeft > 0
                      ? 'Pop coins, jellies, bubbles and candies before they hit the floor. Dodge the bombs.'
                      : 'Practice runs don’t rank or earn, but they keep your thumbs sharp. Ranked rounds refill at 00:00 UTC.'}
                  </p>
                  <button type="button" className="btn btn-primary btn-block" onClick={begin} disabled={!player}>
                    {roundsLeft > 0 ? 'Start ranked round' : 'Practice'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
