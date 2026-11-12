'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, RefreshCw, Timer, Wallet } from 'lucide-react';
import type { TabId } from '@/components/shell/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { avatarColor, formatDuration, initials } from '@/lib/format';
import type { LeaderboardResponse, LeaderboardRow } from '@/lib/types';

const PODIUM = [
  { place: 2, height: 74, color: '#8aa0b8', bg: 'linear-gradient(180deg, #e6edf5, #d3dde9)' },
  { place: 1, height: 100, color: '#e6a400', bg: 'linear-gradient(180deg, #fff1b8, #ffd966)' },
  { place: 3, height: 58, color: '#d27b3e', bg: 'linear-gradient(180deg, #ffe0c7, #f8c49b)' },
];

function Row({ row, index }: { row: LeaderboardRow; index: number }) {
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
      <strong className="num" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
        {row.score.toLocaleString()}
      </strong>
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
            <p className="eyebrow">This week</p>
            <h1 className="title-xl">Top poppers</h1>
          </div>
          <button type="button" className="icon-btn" onClick={load} aria-label="Refresh leaderboard" disabled={loading}>
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {data && (
          <span className="badge" style={{ marginTop: 10 }}>
            <Timer size={12} /> Resets in {formatDuration(data.resetsInMs)}
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
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

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
            Play a prize game and take the top spot.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => onNavigate('play')}>
            Play now
          </button>
        </div>
      )}

      {rest.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {rest.map((row, i) => (
            <Row key={`${row.rank}-${row.name}`} row={row} index={i} />
          ))}
        </div>
      )}

      {youOutsideTop && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p className="eyebrow">Your position</p>
          <Row row={youOutsideTop} index={0} />
        </div>
      )}
    </>
  );
}
