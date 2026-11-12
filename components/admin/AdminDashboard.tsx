'use client';

import { useEffect, useState, type FormEvent } from 'react';
import styles from './Admin.module.css';

type PlayerRow = {
  id: string;
  name: string;
  address: string | null;
  gamesPlayed: number;
  bestScore: number;
  totalScore: number;
  earnedMilli: number;
  createdAt: string;
};

type RoundRow = {
  id: string;
  ranked: boolean;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  rewardMilli: number;
  txHash: string | null;
  player: { id: string; name: string; address: string | null };
};

type Listing<T> = { rows: T[]; total: number; page: number; pageSize: number };
type Section = 'players' | 'rounds';

const shortAddress = (address: string | null) => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Guest';
const shortId = (id: string) => `${id.slice(0, 8)}…`;
const dateTime = (value: string) => new Date(value).toLocaleString();
const scoreText = (score: number | null) => score === null ? 'In progress' : score.toLocaleString();

export function AdminDashboard() {
  const [section, setSection] = useState<Section>('players');
  const [page, setPage] = useState(0);
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [listing, setListing] = useState<Listing<PlayerRow | RoundRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page) });
      if (section === 'players' && query) params.set('q', query);
      try {
        const response = await fetch(`/api/admin/${section}?${params}`, { cache: 'no-store' });
        const result = (await response.json()) as {
          error?: string;
          players?: PlayerRow[];
          rounds?: RoundRow[];
          total?: number;
          page?: number;
          pageSize?: number;
        };
        if (!response.ok) throw new Error(result.error ?? 'Could not load project records.');
        const rows = section === 'players' ? result.players : result.rounds;
        if (active) {
          setListing({
            rows: rows ?? [],
            total: result.total ?? 0,
            page: result.page ?? 0,
            pageSize: result.pageSize ?? 50,
          });
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load project records.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [page, query, reload, section]);

  const changeSection = (next: Section) => {
    setSection(next);
    setPage(0);
    setListing(null);
  };

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setQuery(draftQuery.trim());
  };

  const pages = Math.max(1, Math.ceil((listing?.total ?? 0) / (listing?.pageSize ?? 50)));

  return (
    <main className={styles.main}>
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>PROJECT OPERATIONS</p>
          <h1>Admin</h1>
          <p className={styles.subheading}>Review player accounts and game activity.</p>
        </div>
        <button className={styles.secondaryButton} disabled={loading} onClick={() => setReload((value) => value + 1)} type="button">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className={styles.sectionBar}>
        <div className={styles.tabs} role="tablist" aria-label="Project records">
          <button aria-selected={section === 'players'} className={section === 'players' ? styles.tabActive : styles.tab} onClick={() => changeSection('players')} role="tab" type="button">
            Players
          </button>
          <button aria-selected={section === 'rounds'} className={section === 'rounds' ? styles.tabActive : styles.tab} onClick={() => changeSection('rounds')} role="tab" type="button">
            Game rounds
          </button>
        </div>
        {section === 'players' && (
          <form className={styles.searchForm} onSubmit={search}>
            <label className={styles.visuallyHidden} htmlFor="player-search">Search players</label>
            <input id="player-search" onChange={(event) => setDraftQuery(event.target.value)} placeholder="Search name or wallet" value={draftQuery} />
            <button type="submit">Search</button>
          </form>
        )}
      </div>

      <section className={styles.panel} aria-live="polite">
        <div className={styles.panelHeading}>
          <div>
            <h2>{section === 'players' ? 'Player directory' : 'Game-round activity'}</h2>
            <p>{listing ? `${listing.total.toLocaleString()} ${section === 'players' ? 'players' : 'rounds'}` : 'Loading records'}</p>
          </div>
        </div>

        {error && <p className={styles.errorBanner} role="alert">{error}</p>}
        {loading && <p className={styles.emptyState}>Loading records…</p>}
        {!loading && !error && listing?.rows.length === 0 && (
          <p className={styles.emptyState}>{query ? 'No players match that search.' : 'No records yet.'}</p>
        )}

        {!loading && !error && section === 'players' && listing && listing.rows.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Player</th><th>Wallet</th><th>Games</th><th>Best score</th><th>G$ earned</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {(listing.rows as PlayerRow[]).map((player) => (
                  <tr key={player.id}>
                    <td><strong>{player.name || 'Unnamed player'}</strong><small>{shortId(player.id)}</small></td>
                    <td>{shortAddress(player.address)}</td>
                    <td>{player.gamesPlayed.toLocaleString()}</td>
                    <td>{player.bestScore.toLocaleString()}</td>
                    <td>{(player.earnedMilli / 1000).toFixed(3)}</td>
                    <td>{dateTime(player.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && section === 'rounds' && listing && listing.rows.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Player</th><th>Mode</th><th>Score</th><th>G$ reward</th><th>Started</th><th>Transaction</th></tr>
              </thead>
              <tbody>
                {(listing.rows as RoundRow[]).map((round) => (
                  <tr key={round.id}>
                    <td><strong>{round.player.name || shortAddress(round.player.address)}</strong><small>{shortId(round.player.id)}</small></td>
                    <td><span className={round.ranked ? styles.badgeRanked : styles.badge}>{round.ranked ? 'Ranked' : 'Free'}</span></td>
                    <td>{scoreText(round.score)}</td>
                    <td>{(round.rewardMilli / 1000).toFixed(3)}</td>
                    <td>{dateTime(round.startedAt)}</td>
                    <td>{round.txHash ? `${round.txHash.slice(0, 8)}…${round.txHash.slice(-6)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {listing && listing.total > listing.pageSize && (
          <div className={styles.pagination}>
            <span>Page {page + 1} of {pages}</span>
            <div>
              <button className={styles.secondaryButton} disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)} type="button">Previous</button>
              <button className={styles.secondaryButton} disabled={page + 1 >= pages || loading} onClick={() => setPage((value) => value + 1)} type="button">Next</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
