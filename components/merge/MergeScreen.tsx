'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Play, Share2, Trophy, X } from 'lucide-react';
import { Mascot } from '@/components/game/Mascot';
import { TierArt, tierStyle } from '@/components/merge/TierArt';
import { formatG } from '@/lib/format';
import { SIZE, boardEmoji, tierInfo, tileValue, type Dir } from '@/lib/merge-engine';
import { useMergeStore } from '@/lib/merge-store';
import { toast } from '@/lib/toast-store';

const GAP = 2.6; // % of board
const CELL = (100 - GAP * (SIZE + 1)) / SIZE;
const pos = (i: number) => `${GAP + i * (CELL + GAP)}%`;
const KEYS: Record<string, Dir> = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R' };

export function MergeScreen({ onViewRanks }: { onViewRanks: () => void }) {
  const { status, mode, game, number, result, practiceBest, mascot, swipe, finish, exit, startPractice } = useMergeStore();
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dir = KEYS[event.key];
      if (!dir) return;
      event.preventDefault();
      swipe(dir);
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [swipe]);

  if (!mounted || !game) return null;

  const onPointerDown = (event: PointerEvent) => {
    start.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    start.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
  };

  const share = async () => {
    const text = [
      `Jelly Merge #${number} ${tierInfo(game.maxTier).emoji}`,
      `Score ${game.score.toLocaleString()} · ${tierInfo(game.maxTier).name}${result?.rank ? ` · #${result.rank} today` : ''}`,
      boardEmoji(game.tiles),
      window.location.origin,
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Result copied', 'Paste it anywhere to challenge your friends.');
      }
    } catch {
      // share sheet dismissed
    }
  };

  const next = Math.min(game.maxTier + 1, 11);
  const best = mode === 'practice' ? Math.max(practiceBest, game.score) : null;

  return createPortal(
    <motion.div className="merge-screen" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} role="dialog" aria-label="Jelly Merge">
      <div className="gs-backdrop" aria-hidden>
        <span className="gs-bokeh" style={{ left: '6%', top: '10%', width: 160, height: 160 }} />
        <span className="gs-bokeh" style={{ left: '66%', top: '62%', width: 190, height: 190, animationDelay: '-4s' }} />
      </div>

      <header className="mg-header">
        <button type="button" className="gs-icon" onClick={() => (status === 'playing' ? setMenu(true) : exit())} aria-label="Menu">
          <X size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <span className="gs-level">{mode === 'daily' ? `Daily puzzle #${number}` : 'Practice'}</span>
          <motion.div key={game.score} className="gs-score num" initial={{ scale: 1.12 }} animate={{ scale: 1 }}>
            {game.score.toLocaleString()}
          </motion.div>
        </div>
        <div className="mg-next" aria-label={`Next goal: ${tierInfo(next).name}`}>
          <span>Next</span>
          <div className="mg-next-art" style={{ background: tierStyle(next).bg }}>
            <TierArt tier={next} />
          </div>
        </div>
      </header>

      <div className="mg-stats">
        <span>
          Best jelly <strong>{tierInfo(game.maxTier).name}</strong>
        </span>
        {best !== null ? (
          <span>
            Best <strong className="num">{best.toLocaleString()}</strong>
          </span>
        ) : (
          <span>
            Moves <strong className="num">{game.moves.length}</strong>
          </span>
        )}
      </div>

      <div className="mg-board-wrap">
        <AnimatePresence>
          {game.lastGain > 0 && (
            <motion.div
              key={game.moves.length}
              className="mg-gain"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: -16, scale: 1 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.35 }}
            >
              +{game.lastGain}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mg-board" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (start.current = null)}>
          {Array.from({ length: SIZE * SIZE }, (_, i) => (
            <span key={i} className="mg-cell" style={{ left: pos(i % SIZE), top: pos(Math.floor(i / SIZE)), width: `${CELL}%`, height: `${CELL}%` }} />
          ))}
          {[...game.ghosts.map((tile) => ({ ...tile, ghost: true })), ...game.tiles.map((tile) => ({ ...tile, ghost: false }))].map((tile) => {
            const style = tierStyle(tile.tier);
            return (
              <motion.div
                key={tile.id}
                className={`mg-tile ${tile.ghost ? 'ghost' : ''} ${tile.born === 'merge' ? 'merged' : ''} tier-${Math.min(tile.tier, 11)}`}
                style={{ width: `${CELL}%`, height: `${CELL}%`, zIndex: tile.ghost ? 1 : tile.born === 'merge' ? 3 : 2 }}
                initial={tile.born ? { left: pos(tile.c), top: pos(tile.r) } : false}
                animate={{ left: pos(tile.c), top: pos(tile.r), opacity: tile.ghost ? 0 : 1 }}
                transition={{ left: { duration: 0.11, ease: 'easeOut' }, top: { duration: 0.11, ease: 'easeOut' }, opacity: { delay: tile.ghost ? 0.1 : 0, duration: 0.05 } }}
              >
                <motion.div
                  className="mg-tile-inner"
                  style={{ background: style.bg, boxShadow: `0 6px 18px ${style.glow}, inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -4px 0 rgba(0,0,0,0.12)` }}
                  initial={tile.born === 'spawn' ? { scale: 0 } : tile.born === 'merge' ? { scale: 0.6 } : false}
                  animate={{ scale: 1 }}
                  transition={tile.born === 'merge' ? { type: 'spring', stiffness: 600, damping: 14, delay: 0.08 } : { type: 'spring', stiffness: 500, damping: 22, delay: 0.1 }}
                >
                  <div className="mg-art">
                    <TierArt tier={tile.tier} />
                  </div>
                  <span className="mg-value num">{tileValue(tile.tier)}</span>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
        <p className="mg-hint">Swipe to slide · match two to merge</p>
      </div>

      <div className="gs-mascot">
        <Mascot mood={mascot.mood} line={mascot.line} at={mascot.at} size={70} side="right" />
      </div>

      <AnimatePresence>
        {menu && status === 'playing' && (
          <motion.div className="gs-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="overlay-panel" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <p className="eyebrow">Paused</p>
              <p className="title-md" style={{ margin: '6px 0 16px', fontSize: '1.5rem' }}>
                {mode === 'daily' ? 'Your board is saved' : 'Take a breather'}
              </p>
              <button type="button" className="btn btn-primary btn-block" onClick={() => setMenu(false)}>
                <Play size={18} fill="currentColor" /> Keep playing
              </button>
              {mode === 'daily' && (
                <button type="button" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={() => { setMenu(false); void finish(); }}>
                  Submit score now
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={() => { setMenu(false); exit(); }}>
                <Home size={16} /> {mode === 'daily' ? 'Back to lobby (resume later)' : 'Quit practice'}
              </button>
            </motion.div>
          </motion.div>
        )}

        {(status === 'submitting' || status === 'over') && (
          <motion.div className="gs-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {status === 'submitting' || !result ? (
              <div className="overlay-panel">
                <div className="spinner" style={{ margin: '0 auto 12px', width: 30, height: 30, color: 'var(--violet)' }} />
                <p className="title-md">Verifying your board…</p>
              </div>
            ) : (
              <motion.div className="overlay-panel result-panel" initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
                <div className="result-mascot">
                  <Mascot mood={mascot.mood} line={mascot.line} at={mascot.at} size={96} side="right" />
                </div>
                <p className="eyebrow">{mode === 'daily' ? `Daily puzzle #${number}` : 'Practice run'}</p>
                <div className="title-xl num" style={{ fontSize: '3.2rem' }}>
                  {result.score.toLocaleString()}
                </div>
                <div className="mg-result-tile">
                  <div className="mg-next-art" style={{ background: tierStyle(result.maxTier).bg, width: 44, height: 44 }}>
                    <TierArt tier={result.maxTier} />
                  </div>
                  Best jelly: <strong>{tierInfo(result.maxTier).name}</strong>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '10px 0 4px' }}>
                  {result.rank && (
                    <span className="badge badge-gold">
                      <Trophy size={12} /> #{result.rank} today
                    </span>
                  )}
                  {result.reward > 0 && <span className="badge badge-mint">+{formatG(result.reward, 3)} G$</span>}
                  <span className="badge">+{result.xpGained} XP</span>
                  {result.error && <span className="badge badge-coral">{result.error}</span>}
                </div>
                {result.completed.length > 0 && (
                  <div className="result-missions">
                    {result.completed.map((mission) => (
                      <div key={mission.id} className="result-mission">
                        ✓ {mission.title} <span>+{mission.xp} XP to claim</span>
                      </div>
                    ))}
                  </div>
                )}
                {mode === 'daily' && (
                  <button type="button" className="btn btn-gold btn-block" style={{ marginTop: 12 }} onClick={share}>
                    <Share2 size={18} /> Share result
                  </button>
                )}
                <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={startPractice}>
                  <Play size={18} fill="currentColor" /> {mode === 'daily' ? 'Practice mode' : 'Play again'}
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}
