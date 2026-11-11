'use client';

import { Flame, Trophy, Zap } from 'lucide-react';
import { GameArena } from '@/components/game/GameArena';
import { TokenArt } from '@/components/game/TokenArt';
import type { TabId } from '@/components/shell/AppShell';
import { useGameStore } from '@/lib/game-store';
import { usePlayerStore } from '@/lib/player-store';

const LEGEND = [
  { skin: 'coin', label: 'Coin +10' },
  { skin: 'jelly-cube', label: 'Jelly +10' },
  { skin: 'bubble', label: 'Bubble +10' },
  { skin: 'golden', label: 'Star +20' },
  { skin: 'rocket', label: 'Slow-mo' },
  { skin: 'bomb', label: 'Avoid!' },
] as const;

export function PlayView({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const player = usePlayerStore((s) => s.player);
  const focused = useGameStore((s) => s.status === 'playing' || s.status === 'countdown');

  return (
    <>
      {!focused && (
        <div className="card card-hero">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="eyebrow">{player?.name ? `Hey ${player.name}` : 'Welcome to GoodTap'}</p>
              <h1 className="title-xl">
                Tap. Streak.
                <br />
                <span className="gold-text">Earn G$.</span>
              </h1>
            </div>
            <div className="round-pips" aria-label={`${player?.roundsLeft ?? 0} of ${player?.maxRounds ?? 5} ranked rounds left`} style={{ marginTop: 6 }}>
              {Array.from({ length: player?.maxRounds ?? 5 }, (_, i) => (
                <span key={i} className={`round-pip ${i < (player?.roundsLeft ?? 0) ? 'on' : ''}`} />
              ))}
            </div>
          </div>

          <div className="stat-grid" style={{ marginTop: 16 }}>
            <div className="stat">
              <p className="eyebrow" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Trophy size={11} /> Best
              </p>
              <div className="stat-value num">{player ? player.bestScore.toLocaleString() : '–'}</div>
            </div>
            <div className="stat">
              <p className="eyebrow" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Flame size={11} /> This week
              </p>
              <div className="stat-value num">{player ? player.weeklyBest.toLocaleString() : '–'}</div>
            </div>
            <div className="stat">
              <p className="eyebrow" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Zap size={11} /> Rounds
              </p>
              <div className="stat-value num">
                {player ? `${player.roundsLeft}/${player.maxRounds}` : '–'}
              </div>
            </div>
          </div>
        </div>
      )}

      <GameArena onViewRanks={() => onNavigate('ranks')} />

      {!focused && (
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
            Tap coins, jellies, bubbles and candies before they reach the floor. Each one that lands costs a life. Chain catches to reach x2 at 10, x3 at 25 and x4 at 50.
          </p>
        </div>
      )}
    </>
  );
}
