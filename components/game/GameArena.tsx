'use client';

import { useEffect, useRef } from 'react';
import { Heart, Sparkles, Trophy } from 'lucide-react';
import { useGameStore } from '@/lib/game-store';
import { ARENA_HEIGHT, ARENA_WIDTH } from '@/lib/game-rules';

const tokenLabels: Record<string, string> = {
  standard: '10',
  golden: '20',
  rocket: 'R',
  bomb: 'B',
};

export function GameArena() {
  const rafId = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const { roundStatus, score, bestScore, lives, streak, multiplier, tokens, startRound, tick, tapToken, latestMessage } = useGameStore();

  useEffect(() => {
    const step = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      const deltaMs = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;
      tick(deltaMs);
      rafId.current = window.requestAnimationFrame(step);
    };

    rafId.current = window.requestAnimationFrame(step);
    return () => {
      if (rafId.current) {
        window.cancelAnimationFrame(rafId.current);
      }
    };
  }, [tick]);

  const nextTarget = 100;
  const progress = Math.min((score / nextTarget) * 100, 100);

  return (
    <div className="game-card-wrap">
      <div className="game-status-row">
        <div className="game-score-box">
          <span className="eyebrow">Score</span>
          <strong>{score}</strong>
        </div>
        <div className="game-score-box compact">
          <span className="eyebrow">Lives</span>
          <div className="life-row">
            {Array.from({ length: 3 }, (_, index) => (
              <Heart key={`life-${index}`} size={16} fill={index < lives ? '#ff7e72' : 'rgba(148,163,184,0.25)'} color={index < lives ? '#ff7e72' : 'rgba(148,163,184,0.35)'} />
            ))}
          </div>
        </div>
        <div className="game-score-box compact">
          <span className="eyebrow">Streak</span>
          <strong>{streak}</strong>
        </div>
      </div>

      <div className="streak-bar-wrap">
        <div className="streak-meta">
          <span>Streak x{multiplier}</span>
          <span>{streak}/50</span>
        </div>
        <div className="progress-bar">
          <span style={{ width: `${Math.min((streak / 50) * 100, 100)}%` }} />
        </div>
      </div>

      <div className="arena-shell">
        {roundStatus !== 'playing' && (
          <div className="game-overlay">
            <div className="overlay-panel">
              {roundStatus === 'ended' ? (
                <>
                  <p className="eyebrow">Round complete</p>
                  <h2 className="headline-md">{score} pts</h2>
                  <p className="overlay-copy">Best: {bestScore} • {latestMessage}</p>
                  <button className="btn btn-primary" type="button" onClick={startRound}>
                    Play next round
                  </button>
                </>
              ) : (
                <>
                  <p className="eyebrow">GoodTap</p>
                  <h2 className="headline-md">Ready for a run?</h2>
                  <p className="overlay-copy">Hit tokens, build streaks, and keep the combo alive.</p>
                  <button className="btn btn-primary" type="button" onClick={startRound}>
                    Start round
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="arena-surface game-play-surface" aria-label="GoodTap arena">
          {tokens.map((token) => (
            <button
              key={token.id}
              type="button"
              className={`token ${token.type}`}
              style={{
                left: `${(token.x / ARENA_WIDTH) * 100}%`,
                top: `${(token.y / ARENA_HEIGHT) * 100}%`,
                width: `${token.radius * 2}px`,
                height: `${token.radius * 2}px`,
              }}
              onClick={() => tapToken(token.id)}
              aria-label={`${token.type} token`}
            >
              {tokenLabels[token.type]}
            </button>
          ))}
        </div>
      </div>

      <div className="milestone-row">
        <div className="milestone-copy">
          <Trophy size={16} />
          <span>{latestMessage}</span>
        </div>
        <div className="milestone-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="bonus-strip">
        <div className="bonus-pill">
          <Sparkles size={14} />
          <span>Next aim: 100 pts</span>
        </div>
      </div>
    </div>
  );
}
