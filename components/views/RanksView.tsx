'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, RefreshCw, Timer, Wallet } from 'lucide-react';
import type { TabId } from '@/components/shell/AppShell';
import { PotCard } from '@/components/tournament/PotCard';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { avatarColor, formatDuration, formatG, initials } from '@/lib/format';
import type { LeaderboardResponse, LeaderboardRow } from '@/lib/types';

const PODIUM = [
  { place: 2, height: 92, color: '#8aa0b8', bg: '#dfe6ef' },
  { place: 1, height: 112, color: '#e6a400', bg: '#ffe48a' },
  { place: 3, height: 80, color: '#d27b3e', bg: '#fbd3b2' },
];

function Row({ row, index, prize }: { row: LeaderboardRow; index: number; prize?: number }) {
  return (
    <motion.div
      className={`rank-row ${row.isYou ? 'you' : ''}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <span className="rank-num num">{row.rank}</span>
      <Avatar name={row.name} />
      <span style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
        {row.name}
        {row.isYou && <span className="badge" style={{ padding: '2px 7px' }}>You</span>}
        {row.verifiedWallet && <Wallet size={13} color="var(--mint)" aria-label="Wallet player" />}
      </span>
      <span style={{ textAlign: 'right', lineHeight: 1.1 }}>
        <strong className="num" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'block' }}>
          {row.score.toLocaleString()}
        </strong>
        {prize ? <span className="num" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--mint)' }}>{formatG(prize)} G$</span> : null}
      </span>
    </motion.div>
  );
}

export function RanksView({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.leaderboard());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const top3 = data?.rows.slice(0, 3) ?? [];
  const rest = data?.rows.slice(3) ?? [];
  const youOutsideTop = data?.you && !data.rows.some((row) => row.isYou) ? data.you : null;

  return (
    <>
      <div className="card card-hero">
        <div className="row">
          <div>
            <p className="eyebrow">Weekly tournament</p>
            <h1 className="title-xl">Top poppers</h1>
            {data && data.prizes.length > 0 && (
              <p className="copy" style={{ marginTop: 4, fontSize: '0.85rem' }}>
                Top {data.prizes.length} win G$ · {formatG(data.prizes.reduce((sum, prize) => sum + prize, 0))} G$ in prizes
              </p>
            )}
          </div>
          <button type="button" className="icon-btn" onClick={load} aria-label="Refresh leaderboard" disabled={loading}>
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {data && (
          <span className="badge" style={{ marginTop: 10 }}>
            <Timer size={12} /> Ends in {formatDuration(data.resetsInMs)}
          </span>
        )}

        {top3.length > 0 && (
          <div className="podium">
            {PODIUM.map(({ place, height, color, bg }) => {
              const row = top3[place - 1];
              if (!row) return <div key={place} />;
              return (
                <motion.div
                  key={place}
                  className="podium-spot"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: place * 0.08, type: 'spring', stiffness: 260, damping: 22 }}
                >
                  {place === 1 && <Crown size={22} color={color} fill={color} />}
                  <div className="podium-avatar" style={{ borderColor: color, background: avatarColor(row.name) }}>
                    {initials(row.name)}
                  </div>
                  <span className="podium-name">{row.isYou ? 'You' : row.name}</span>
                  <div className="podium-block" style={{ height, background: bg, color }}>
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{place}</span>
                    <span className="num" style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>
                      {row.score.toLocaleString()}
                    </span>
                    {data?.prizes[place - 1] ? (
                      <span className="num" style={{ fontSize: '0.72rem', color: 'var(--ink)', opacity: 0.7 }}>
                        {formatG(data.prizes[place - 1])} G$
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {data && <PotCard total={data.pot.total} boosted={data.pot.boosted} onBoosted={load} />}

      {loading && !data && (
        <div style={{ display: 'grid', gap: 8 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 56 }} />
          ))}
        </div>
      )}

      {failed && !data && (
        <div className="notice warn">Couldn’t load the scores. Check your internet and tap refresh.</div>
      )}

      {data && data.rows.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="title-md">No scores yet this week</p>
          <p className="copy" style={{ margin: '6px 0 14px' }}>
            Play a tournament game and take the top spot.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => onNavigate('play')}>
            Play now
          </button>
        </div>
      )}

      {rest.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {rest.map((row, i) => (
            <Row key={`${row.rank}-${row.name}`} row={row} index={i} prize={data?.prizes[row.rank - 1]} />
          ))}
        </div>
      )}

      {youOutsideTop && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p className="eyebrow">Your position</p>
          <Row row={youOutsideTop} index={0} prize={data?.prizes[youOutsideTop.rank - 1]} />
        </div>
      )}

      {data?.lastWeek && data.lastWeek.winners.length > 0 && (
        <div className="card">
          <p className="eyebrow">Last week’s winners</p>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {data.lastWeek.winners.slice(0, 5).map((winner) => (
              <div key={winner.rank} className="row" style={{ fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 700 }}>
                  {winner.rank}. {winner.isYou ? 'You' : winner.name}
                </span>
                <span className="num" style={{ color: 'var(--faint)' }}>
                  {winner.score.toLocaleString()} · <strong style={{ color: 'var(--ink)' }}>{formatG(winner.prize)} G$</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
