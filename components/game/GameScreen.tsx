'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Home, Pause, Play, Rocket, Trophy, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Mascot } from '@/components/game/Mascot';
import { SKIN_COLORS, TokenArt } from '@/components/game/TokenArt';
import { onChainMode } from '@/lib/chain/config';
import { formatG } from '@/lib/format';
import { ARENA_WIDTH, STARTING_LIVES, levelStartsAt, nextLevelAt, nextStreakThreshold, swayX, worldForLevel } from '@/lib/game-rules';
import { useGameStore, type Pop } from '@/lib/game-store';
import { usePlayerStore } from '@/lib/player-store';
import { toast } from '@/lib/toast-store';

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

/** The tap effect: the token swells and vanishes, a ring expands and particles fly, styled per skin. */
function PopEffect({ pop, height }: { pop: Pop; height: number }) {
  if (pop.kind === 'miss' || !pop.skin) return null;
  const colors = SKIN_COLORS[pop.skin];
  const size = pop.size ?? 46;
  const isJelly = pop.skin === 'jelly-drop' || pop.skin === 'jelly-cube';
  const isBubble = pop.skin === 'bubble';
  const sparkly = pop.skin === 'golden' || pop.skin === 'coin';
  const count = pop.skin === 'golden' ? 18 : isJelly ? 10 : 14;
  const left = pct(pop.x, ARENA_WIDTH);
  const top = pct(pop.y, height);

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
const SPARKLES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 96}%`,
  top: `${(i * 53 + 7) % 92}%`,
  size: 6 + (i % 4) * 3,
  delay: `${-(i * 0.43) % 3}s`,
}));

const BOKEH = [
  { left: '8%', top: '14%', size: 140 },
  { left: '72%', top: '8%', size: 110 },
  { left: '60%', top: '52%', size: 170 },
  { left: '14%', top: '68%', size: 130 },
  { left: '42%', top: '30%', size: 90 },
];

export function GameScreen({ onViewRanks }: { onViewRanks: () => void }) {
  const game = useGameStore(
    useShallow((s) => ({
      status: s.status,
      score: s.score,
      level: s.level,
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
      mascot: s.mascot,
      arenaHeight: s.arenaHeight,
    })),
  );
  const { startRound, tick, tapToken, pause, resume, quit, exit, setArenaHeight } = useGameStore.getState();
  const player = usePlayerStore((s) => s.player);
  const arenaRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  // Match the play field's logical height to the screen so tall phones get more room, not stretched art.
  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setArenaHeight((ARENA_WIDTH * height) / width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted, setArenaHeight]);

  // Leaving the tab pauses the round, and the page underneath doesn't scroll while playing.
  useEffect(() => {
    const onHide = () => document.hidden && pause();
    document.addEventListener('visibilitychange', onHide);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      document.body.classList.remove('no-scroll');
    };
  }, [pause]);

  useEffect(() => {
    const el = screenRef.current;
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
      exit();
    }
  };

  if (!mounted) return null;

  const world = worldForLevel(game.level);
  const slowmo = game.status === 'playing' && now - game.startedAt < game.slowmoUntil;
  const threshold = nextStreakThreshold(game.streak);
  const comboProgress = threshold ? (game.streak / threshold) * 100 : 100;
  const levelStart = levelStartsAt(game.level);
  const levelProgress = Math.min(1, (game.score - levelStart) / (nextLevelAt(game.level) - levelStart));
  const roundsLeft = player?.roundsLeft ?? 0;
  const result = game.result;
  const fever = (game.status === 'playing' || game.status === 'paused') && game.multiplier >= 3;

  return createPortal(
    <motion.div
      ref={screenRef}
      className={`game-screen world-${world.id} ${fever ? 'fever' : ''} ${slowmo ? 'slowmo' : ''}`}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      role="dialog"
      aria-label="GoodTap game"
    >
      <div className="gs-backdrop" aria-hidden>
        <div className="gs-fever" />
        {BOKEH.map((b, i) => (
          <span key={i} className="gs-bokeh" style={{ left: b.left, top: b.top, width: b.size, height: b.size, animationDelay: `${-i * 1.7}s` }} />
        ))}
        {SPARKLES.map((star, i) => (
          <span key={`s${i}`} className="gs-sparkle" style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }} />
        ))}
      </div>

      <header className="gs-hud">
        <button type="button" className="gs-icon" onClick={pause} aria-label="Pause" disabled={game.status !== 'playing'}>
          <Pause size={20} fill="currentColor" />
        </button>
        <div className="gs-score-block">
          <span className="gs-level">
            Lv {game.level} · {world.name}
          </span>
          <motion.div key={game.score} className="gs-score num" initial={{ scale: 1.15 }} animate={{ scale: 1 }}>
            {game.score.toLocaleString()}
          </motion.div>
          <div className="gs-level-bar" aria-hidden>
            <motion.span animate={{ width: `${levelProgress * 100}%` }} />
          </div>
        </div>
        <div className="gs-hearts" aria-label={`${game.lives} lives left`}>
          {Array.from({ length: STARTING_LIVES }, (_, i) => (
            <motion.span key={i} animate={{ scale: i < game.lives ? 1 : 0.7, opacity: i < game.lives ? 1 : 0.35 }}>
              <Heart size={22} fill={i < game.lives ? '#ff5f7e' : 'transparent'} color="#ff5f7e" strokeWidth={2.5} />
            </motion.span>
          ))}
        </div>
      </header>

      <div className="gs-combo">
        <div className="combo-track" aria-hidden>
          <div className="combo-fill" style={{ width: `${Math.min(comboProgress, 100)}%` }} />
        </div>
        <motion.div key={game.multiplier} className="combo-mult" initial={{ scale: 1.6 }} animate={{ scale: 1 }}>
          x{game.multiplier}
        </motion.div>
        {slowmo && (
          <span className="badge badge-mint">
            <Rocket size={12} /> Slow-mo
          </span>
        )}
      </div>

      <div ref={arenaRef} className="gs-arena" aria-label="Play field">
        {game.tokens.map((token) => (
          <button
            key={token.id}
            type="button"
            className={`token ${token.type} skin-${token.skin}`}
            style={{
              left: pct(swayX(token), ARENA_WIDTH),
              top: pct(token.y, game.arenaHeight),
              width: pct(token.radius * 2, ARENA_WIDTH),
              aspectRatio: '1',
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              tapToken(token.id);
            }}
            aria-label={`${token.skin} token`}
          >
            <TokenArt skin={token.skin} />
          </button>
        ))}

        <AnimatePresence>
          {game.pops.map((pop) => (
            <motion.div key={pop.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} exit={{ opacity: 0 }}>
              <PopEffect pop={pop} height={game.arenaHeight} />
              <motion.span
                className={`pop ${pop.kind}`}
                style={{ left: pct(pop.x, ARENA_WIDTH), top: pct(pop.y, game.arenaHeight) }}
                initial={{ y: 0, opacity: 1, scale: 0.7 }}
                animate={{ y: -52, opacity: 0, scale: 1.15 }}
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
              key={game.banner.title}
              className="gs-banner"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            >
              <strong>{game.banner.title}</strong>
              {game.banner.subtitle && <span>{game.banner.subtitle}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {game.status !== 'ended' && (
        <div className="gs-mascot">
          <Mascot mood={game.mascot.mood} line={game.mascot.line} at={game.mascot.at} size={70} side="right" />
        </div>
      )}

      <AnimatePresence>
        {game.status !== 'playing' && (
          <motion.div className="gs-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {game.status === 'countdown' ? (
              <motion.div
                key={game.countdown}
                className="countdown"
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              >
                {game.countdown}
              </motion.div>
            ) : game.status === 'paused' ? (
              <motion.div className="overlay-panel" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                <p className="eyebrow">Paused</p>
                <p className="title-md" style={{ margin: '6px 0 16px', fontSize: '1.7rem' }}>
                  Take a breather
                </p>
                <button type="button" className="btn btn-primary btn-block" onClick={resume}>
                  <Play size={18} fill="currentColor" /> Resume
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={quit}>
                  <X size={16} /> End round
                </button>
              </motion.div>
            ) : game.status === 'starting' || game.status === 'submitting' ? (
              <div className="overlay-panel">
                <div className="spinner" style={{ margin: '0 auto 12px', width: 30, height: 30, color: 'var(--violet)' }} />
                <p className="title-md">{game.status === 'starting' ? 'Loading round…' : 'Checking your score…'}</p>
              </div>
            ) : game.status === 'ended' && result ? (
              <motion.div className="overlay-panel result-panel" initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
                <div className="result-mascot">
                  <Mascot mood={game.mascot.mood} line={game.mascot.line} at={game.mascot.at} size={96} side="right" />
                </div>
                <p className="eyebrow">{result.ranked ? 'Ranked round' : 'Practice round'}</p>
                <div className="title-xl num" style={{ fontSize: '3.4rem' }}>
                  {result.score.toLocaleString()}
                </div>
                <p className="copy" style={{ fontSize: '0.85rem' }}>
                  Reached level {result.level ?? game.level} · {worldForLevel(result.level ?? game.level).name}
                </p>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '10px 0 6px' }}>
                  {result.newBest && (
                    <span className="badge badge-gold">
                      <Trophy size={12} /> New best!
                    </span>
                  )}
                  {result.reward > 0 && <span className="badge badge-mint">+{formatG(result.reward, 3)} G$</span>}
                  {result.xpGained ? <span className="badge">+{result.xpGained} XP</span> : null}
                  {result.ranked && result.reward === 0 && onChainMode && !player?.address && <span className="badge">Connect a wallet to earn G$</span>}
                  {result.offline && <span className="badge badge-coral">Not saved: offline</span>}
                  {result.rejected && <span className="badge badge-coral">Score not accepted</span>}
                </div>
                {result.completed && result.completed.length > 0 && (
                  <div className="result-missions">
                    {result.completed.map((mission) => (
                      <motion.div key={mission.id} className="result-mission" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                        ✓ {mission.title} <span>+{mission.xp} XP to claim</span>
                      </motion.div>
                    ))}
                  </div>
                )}
                <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={begin}>
                  <Play size={18} fill="currentColor" /> {roundsLeft > 0 ? `Play again · ${roundsLeft} left` : 'Practice again'}
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={exit}>
                    <Home size={16} /> Lobby
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      exit();
                      onViewRanks();
                    }}
                  >
                    <Trophy size={16} /> Ranks
                  </button>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}
