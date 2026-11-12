import type { Metadata } from 'next';
import { LegalPage, SupportContact } from '@/components/legal/LegalPage';
import { tournamentsEnabled } from '@/lib/chain/config';

export const metadata: Metadata = { title: 'Terms · Xurri' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="12 November 2026">
      <p>By playing Xurri you agree to these terms. If you don’t agree, please don’t use the app.</p>

      <h2>Who can play</h2>
      <p>
        You must be old enough to use crypto apps{tournamentsEnabled ? ' and enter skill competitions with prizes' : ''} where you
        live, and it must be legal for you to do so. You are responsible for checking this.
      </p>

      <h2>How you can earn G$</h2>
      <ul>
        <li>
          <strong>Daily claims.</strong> GoodDollar’s own daily claim is run by GoodDollar, not by us; we only give you a
          button for it. The Xurri daily gift is paid by Xurri.
        </li>
        {tournamentsEnabled && (
          <li>
            <strong>The weekly tournament.</strong> The best scores of each week (Monday to Sunday, UTC) win G$. Prizes are
            shown on the leaderboard before the week starts.
          </li>
        )}
      </ul>
      <p>
        Playing a game never pays G$ by itself.
        {tournamentsEnabled ? ' Practice games don’t count for the tournament.' : ' The weekly leaderboard is just for fun and has no prizes.'}
      </p>

      <h2>Spending G$</h2>
      <ul>
        <li>Shop items are for looks only and can’t be refunded. 10% of every purchase goes to GoodDollar’s UBI pool.</li>
        {tournamentsEnabled && (
          <li>
            G$ you add to a prize pot is a gift to that week’s winners and can’t be taken back. Pot gifts also send 10% to
            GoodDollar’s UBI pool; the rest goes to the tournament prize pot.
          </li>
        )}
      </ul>

      <h2>Fair play</h2>
      <ul>
        <li>The daily gift needs a wallet that has passed GoodDollar’s face check. One person claims once, however many wallets they use.</li>
        <li>Bots, scripts, changed apps and shared accounts are not allowed. We may remove scores and block accounts that break these rules.</li>
        {tournamentsEnabled && (
          <>
            <li>Only tournament games count for prizes, and you can play a limited number each day. Starting one is a Celo transaction; you pay its network fee.</li>
            <li>We check the top scores before paying and may hold or cancel prizes. Prizes arrive about a day after the week ends, in the Rewards tab.</li>
          </>
        )}
      </ul>

      <h2>Your wallet and G$</h2>
      <p>
        You are responsible for your wallet and its keys. Blockchain transactions can’t be undone. The value of G$ and
        CELO can go up or down, and nothing in Xurri is financial advice. If Xurri’s funds run low, daily gifts{tournamentsEnabled ? ' and prizes' : ''}
        may be smaller, delayed or paused.
      </p>

      <h2>No guarantees</h2>
      <p>
        Xurri is provided as it is. We try to keep it running and fair but can’t promise it will always be available
        or free of mistakes. As far as the law allows, we are not responsible for losses from using the app, network
        problems, or third-party services such as wallets, Celo or GoodDollar.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. Big changes will be shown in the app before they take effect.</p>

      <h2>Contact</h2>
      <p>
        Questions or problems? Reach us at <SupportContact />.
      </p>
    </LegalPage>
  );
}
