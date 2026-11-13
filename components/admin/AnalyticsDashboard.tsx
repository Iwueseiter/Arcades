'use client';

import { useEffect, useState } from 'react';
import styles from './Admin.module.css';

type TrendPoint = { day: string; pageViews: number; newPlayers: number; rounds: number };
type ChainIndex =
  | { status: 'not-configured' }
  | { status: 'deployment-block-required' }
  | { status: 'waiting-for-deployment-block'; latestBlock: string }
  | { status: 'syncing' | 'synced'; indexedThrough: string; latestBlock: string; indexedEvents?: number }
  | { status: 'error'; message: string }
  | { status: 'not-requested' };

type Analytics = {
  periodDays: number;
  since: string;
  players: number;
  playersEverPlayed: number;
  activeUsers: number;
  newPlayers: number;
  rounds: number;
  pageViews: number;
  uniqueVisitors: number;
  arcadeTransactions: number | null;
  gDollarPaid: string | null;
  gDollarSpent: string | null;
  gDollarToUbi: string | null;
  trend: TrendPoint[];
  chainIndex: ChainIndex;
};

type TrendKey = 'pageViews' | 'newPlayers' | 'rounds';
const trendLabels: Record<TrendKey, string> = {
  pageViews: 'Page views',
  newPlayers: 'New players',
  rounds: 'Game rounds',
};

const compactAmount = (value: string | null) => {
  if (value === null) return '—';
  const [whole, fraction = ''] = value.split('.');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${groupedWhole}.${fraction.padEnd(2, '0').slice(0, 2)}`;
};

const dateLabel = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [trendKey, setTrendKey] = useState<TrendKey>('pageViews');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/analytics/overview?days=${days}`, { cache: 'no-store' });
        const result = (await response.json()) as Analytics & { error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Could not load analytics.');
        if (!active) return;
        setData(result);
        setLoading(false);
        timer = setTimeout(() => { void load(); }, result.chainIndex.status === 'syncing' ? 1800 : 30_000);
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Could not load analytics.');
        setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [days, refresh]);

  const trendMax = Math.max(1, ...(data?.trend.map((point) => point[trendKey]) ?? [0]));

  let chainMessage = '';
  let chainError = false;
  switch (data?.chainIndex.status) {
    case 'not-configured':
      chainMessage = 'On-chain totals are unavailable in demo mode. Set the NEXT_PUBLIC_GIFT_ADDRESS, NEXT_PUBLIC_TOURNAMENTS_ADDRESS and NEXT_PUBLIC_SHOP_ADDRESS values to enable them.';
      break;
    case 'deployment-block-required':
      chainMessage = 'Add XURRI_DEPLOY_BLOCK to index the contract history and calculate lifetime totals.';
      break;
    case 'waiting-for-deployment-block':
      chainMessage = `Waiting for configured deployment block. Current chain height: ${data.chainIndex.latestBlock}.`;
      break;
    case 'syncing':
      chainMessage = '';
      break;
    case 'synced':
      chainMessage = `Contract history indexed through block ${data.chainIndex.indexedThrough}.`;
      break;
    case 'error':
      chainMessage = `Contract history could not be updated: ${data.chainIndex.message}`;
      chainError = true;
      break;
  }

  return (
    <main className={styles.main}>
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>GOODDOLLAR PROJECT</p>
          <h1>Analytics</h1>
          <p className={styles.subheading}>Player growth, engagement, traffic and on-chain payouts.</p>
        </div>
        <div className={styles.headingActions}>
          <label className={styles.periodLabel} htmlFor="analytics-period">Activity period</label>
          <select id="analytics-period" className={styles.periodSelect} onChange={(event) => setDays(Number(event.target.value))} value={days}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button className={styles.secondaryButton} disabled={loading} onClick={() => setRefresh((value) => value + 1)} type="button">
            {loading ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className={styles.errorBanner} role="alert">{error}</p>}
      {chainMessage && (
        <p className={chainError ? styles.errorBanner : styles.infoBanner} role={chainError ? 'alert' : 'status'}>
          {chainMessage}
        </p>
      )}

      <section className={styles.metricGrid} aria-label="Project metrics" aria-live="polite">
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Active users</span>
          <strong className={styles.metricValue}>{data?.activeUsers.toLocaleString() ?? '—'}</strong>
          <span className={styles.metricNote}>Started a game in the last {days} days</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Ever played</span>
          <strong className={styles.metricValue}>{data?.playersEverPlayed.toLocaleString() ?? '—'}</strong>
          <span className={styles.metricNote}>Players with at least one completed game</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Total players</span>
          <strong className={styles.metricValue}>{data?.players.toLocaleString() ?? '—'}</strong>
          <span className={styles.metricNote}>All guest and wallet accounts</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>New players</span>
          <strong className={styles.metricValue}>{data?.newPlayers.toLocaleString() ?? '—'}</strong>
          <span className={styles.metricNote}>Joined in the last {days} days</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Page views</span>
          <strong className={styles.metricValue}>{data?.pageViews.toLocaleString() ?? '—'}</strong>
          <span className={styles.metricNote}>First-party tracking, from launch onward</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Unique visitors</span>
          <strong className={styles.metricValue}>{data?.uniqueVisitors.toLocaleString() ?? '—'}</strong>
          <span className={styles.metricNote}>Anonymous browser IDs in this period</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Contract transactions</span>
          <strong className={styles.metricValue}>{data?.arcadeTransactions?.toLocaleString() ?? '—'}</strong>
          <span className={styles.metricNote}>Gift, tournament and shop transactions, lifetime</span>
        </article>
        <article className={`${styles.metricCard} ${styles.metricHighlight}`}>
          <span className={styles.metricLabel}>G$ paid by Xurri</span>
          <strong className={styles.metricValue}>{compactAmount(data?.gDollarPaid ?? null)}</strong>
          <span className={styles.metricNote}>Daily gifts and tournament prizes · lifetime</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>G$ spent in Xurri</span>
          <strong className={styles.metricValue}>{compactAmount(data?.gDollarSpent ?? null)}</strong>
          <span className={styles.metricNote}>Prize pot boosts and shop items · lifetime</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>G$ sent to UBI</span>
          <strong className={styles.metricValue}>{compactAmount(data?.gDollarToUbi ?? null)}</strong>
          <span className={styles.metricNote}>Share of spending sent to GoodDollar’s UBI pool</span>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2>Traction over time</h2>
            <p>Daily totals for the selected period</p>
          </div>
          <div className={styles.chartTabs} role="tablist" aria-label="Trend metric">
            {(Object.keys(trendLabels) as TrendKey[]).map((key) => (
              <button key={key} aria-selected={trendKey === key} className={trendKey === key ? styles.chartTabActive : styles.chartTab} onClick={() => setTrendKey(key)} role="tab" type="button">
                {trendLabels[key]}
              </button>
            ))}
          </div>
        </div>
        {loading && !data ? <p className={styles.emptyState}>Loading analytics…</p> : (
          <div className={styles.chart} role="img" aria-label={`${trendLabels[trendKey]} by day`}>
            {data?.trend.map((point) => {
              const value = point[trendKey];
              const height = value ? Math.max(5, (value / trendMax) * 100) : 0;
              return (
                <div className={styles.chartColumn} key={point.day} title={`${dateLabel(point.day)}: ${value.toLocaleString()}`}>
                  <span className={styles.chartValue}>{days <= 7 ? value.toLocaleString() : ''}</span>
                  <span className={styles.chartBarTrack}>
                    <span className={styles.chartBar} style={{ height: `${height}%` }} />
                  </span>
                  {(days <= 7 || new Date(`${point.day}T00:00:00`).getDate() === 1) && (
                    <span className={styles.chartDate}>{dateLabel(point.day)}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <p className={styles.dataFootnote}>
        Traffic starts being collected when tracking is enabled; older visits are not available. G$ paid counts daily gifts and tournament prizes paid by the Xurri contracts; it excludes GoodDollar UBI claims, which GoodDollar pays directly.
      </p>
    </main>
  );
}
