import type { Metadata } from 'next';
import { LegalPage, SupportContact } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy · Xurri' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="12 November 2026">
      <p>We keep as little about you as we can. Here is all of it.</p>

      <h2>What we store</h2>
      <ul>
        <li>Your wallet address, if you connect one.</li>
        <li>The name you pick and, only if you give it, your email.</li>
        <li>Your game results: scores, when you played, and leaderboard places.</li>
        <li>A cookie that keeps you signed in. We don’t use advertising or tracking cookies.</li>
      </ul>

      <h2>What we don’t store</h2>
      <ul>
        <li>Your face or ID. GoodDollar’s face check happens in GoodDollar’s app, under their privacy policy.</li>
        <li>Your wallet keys. We never see them.</li>
        <li>Your IP address. It is used for a moment to stop request floods, then forgotten.</li>
      </ul>

      <h2>Public by design</h2>
      <p>
        Anything done on Celo, such as daily claims and shop purchases, is public on the
        blockchain, linked to your wallet address. Your name and weekly score appear on the leaderboard.
      </p>

      <h2>How we use it</h2>
      <p>
        To run the game, rank the weekly board, catch cheating and pay out daily gifts. We don’t sell your data or share it with
        advertisers. Our hosting and database providers process it for us.
      </p>

      <h2>Your choices</h2>
      <p>
        You can change your name or remove your email in the Me tab. To have your account deleted, contact{' '}
        <SupportContact />. On-chain records can’t be deleted by anyone.
      </p>
    </LegalPage>
  );
}
