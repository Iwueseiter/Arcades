import type { Metadata } from 'next';
import Link from 'next/link';
import { chainConfig, tournamentsEnabled } from '@/lib/chain/config';
import { getStats } from '@/lib/server/stats';

export const metadata: Metadata = { title: 'Stats · Xurri' };
export const dynamic = 'force-dynamic';

const g = (value: number | null | undefined) =>
  value === null || value === undefined ? '–' : `${value.toLocaleString(undefined, { maximumFractionDigits: value < 100 ? 2 : 0 })} G$`;
const n = (value: number | null | undefined) => (value === null || value === undefined ? '–' : value.toLocaleString());

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stats-tile">
      <span className="stats-label">{label}</span>
      <strong className="num">{value}</strong>
      {hint && <span className="stats-hint">{hint}</span>}
    </div>
  );
}

export default async function StatsPage() {
  const stats = await getStats();
  const { chain } = stats;
  const contracts = [
    ['Daily gift', chainConfig.giftAddress],
    ['Shop', chainConfig.shopAddress],
    ...(tournamentsEnabled ? ([['Tournaments & prize pot', chainConfig.tournamentsAddress]] as const) : []),
  ] as const;

  return (
    <main className="legal stats">
      <Link href="/" className="legal-back">
        ← Back to Xurri
      </Link>
      <h1>Xurri in numbers</h1>
      <p className="legal-updated">Live · week {stats.weekKey}</p>

      <h2>Players</h2>
      <div className="stats-grid">
        <Stat label="Played this week" value={n(stats.activeThisWeek)} />
        <Stat
          label="Came back from last week"
          value={stats.weeklyRetention === null ? '–' : `${Math.round(stats.weeklyRetention * 100)}%`}
          hint={`of ${n(stats.activeLastWeek)} players`}
        />
        <Stat label="Verified people" value={n(stats.verifiedPeople)} hint="GoodDollar face check" />
        <Stat label="Players ever" value={n(stats.players)} />
        <Stat label="Games this week" value={n(stats.gamesThisWeek)} />
      </div>

      <h2>G$ on Celo</h2>
      <div className="stats-grid">
        <Stat label="Daily gifts claimed" value={n(chain?.giftClaims)} hint={g(chain?.giftPaid)} />
        {tournamentsEnabled && (
          <>
            <Stat label="Tournament games" value={n(chain?.tournamentGames)} />
            <Stat label="Prizes paid" value={g(chain?.prizesPaid)} />
            <Stat label="In the prize pot" value={g(chain?.potBalance)} />
            <Stat label="Added to pots" value={g(chain?.potBoosted)} hint="by players and sponsors" />
          </>
        )}
        <Stat label="Spent in the shop" value={g(chain?.shopSpent)} hint={chain?.shopSales === 1 ? '1 item' : `${n(chain?.shopSales)} items`} />
        <Stat label="Sent to GoodDollar UBI" value={g(chain?.toUbi)} />
      </div>

      {tournamentsEnabled && (
        <>
          <h2>Tournaments</h2>
          <div className="stats-grid">
            <Stat label="Weeks finished" value={n(stats.tournamentsFinished)} />
            <Stat label="Different winners" value={n(stats.tournamentWinners)} />
            <Stat label="Prizes awarded" value={g(stats.prizesAwarded)} />
          </div>
        </>
      )}

      <h2>Contracts</h2>
      <ul>
        {contracts.map(([label, address]) => (
          <li key={label}>
            {label}:{' '}
            {address ? (
              <a href={`${chainConfig.explorerUrl}/address/${address}`} target="_blank" rel="noreferrer">
                {address}
              </a>
            ) : (
              'not deployed (test mode)'
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
