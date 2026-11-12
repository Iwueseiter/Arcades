import type { Metadata } from 'next';
import { LegalPage, SupportContact } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Terms · Xurri' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="12 November 2026">
      <p>By playing Xurri you agree to these terms. If you don’t agree, please don’t use the app.</p>

      <h2>Who can play</h2>
      <p>
        You must be old enough to enter skill competitions with prizes where you live, and it must be legal for you to
        do so. You are responsible for checking this.
      </p>

      <h2>How you can earn G$</h2>
      <ul>
        <li>
          <strong>Daily claims.</strong> GoodDollar’s own daily claim is run by GoodDollar, not by us; we only give you a
          button for it. The Xurri daily gift is paid by our prize pool.
        </li>
        <li>
          <strong>The weekly tournament.</strong> The best scores of each week (Monday to Sunday, UTC) win G$. Prizes are
          shown on the leaderboard before the week starts.
        </li>
      </ul>
      <p>Playing a game never pays G$ by itself. Practice games don’t count for the tournament.</p>

      <h2>Spending G$</h2>
      <ul>
        <li>Shop items are for looks only and can’t be refunded.</li>
        <li>
          G$ you add to a prize pot is a gift to that week’s winners and can’t be taken back. Shop purchases and pot
          gifts each send 10% to GoodDollar’s UBI pool; the rest goes to the tournament prize pot.
        </li>
      </ul>

      <h2>Tournament rules</h2>
      <ul>
        <li>Only tournament games count, and you can play a limited number each day.</li>
        <li>Starting a tournament game is a Celo transaction. You pay its network fee. We don’t charge an entry fee.</li>
        <li>You need a wallet that has passed GoodDollar’s face check. One person counts once, however many wallets they use.</li>
        <li>We check the top scores for cheating before paying. Bots, scripts, changed apps and shared accounts are not allowed.</li>
        <li>
          We may remove scores, hold or cancel prizes, and block accounts that break these rules. Our decision on
          results is final.
        </li>
        <li>Prizes arrive about a day after the week ends, and you collect them in the Rewards tab.</li>
      </ul>

      <h2>Your wallet and G$</h2>
      <p>
        You are responsible for your wallet and its keys. Blockchain transactions can’t be undone. The value of G$ and
        CELO can go up or down, and nothing in Xurri is financial advice. If the prize pool runs low, prizes and daily
        gifts may be smaller, delayed or paused.
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
