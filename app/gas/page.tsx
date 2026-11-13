'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Fuel, Send, Wallet } from 'lucide-react';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { Logo } from '@/components/brand/Logo';
import { hasCeloForGas, MIN_CELO_GAS, telegramGasUrl } from '@/lib/access';
import { shortAddress } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';
import { useWalletStore } from '@/lib/chain/wallet-store';

/** In-app page that walks a player through asking for CELO gas on Telegram. */
export default function GasPage() {
  const account = useWalletStore((s) => s.account);
  const celoBalance = useWalletStore((s) => s.chainState?.celoBalance);
  const refresh = usePlayerStore((s) => s.refresh);
  const initWallet = useWalletStore((s) => s.init);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void refresh().then(() => initWallet());
  }, [refresh, initWallet]);

  const hasGas = hasCeloForGas(celoBalance);

  const copy = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="gas-page">
      <PageViewTracker path="/gas" />
      <div className="gas-card">
        <Logo />

        {/* Why CELO is needed */}
        <div className="gas-why">
          <span className="gas-why-icon" aria-hidden>
            <Fuel size={18} />
          </span>
          <div>
            <p className="gas-why-title">CELO is needed to play</p>
            <p className="gas-why-body">
              Every game, claim, and purchase sends a small transaction on Celo. The network charges a tiny fee in CELO
              — usually less than{' '}
              <strong>
                {MIN_CELO_GAS.toLocaleString(undefined, { maximumSignificantDigits: 2 })} CELO
              </strong>
              . If your wallet is empty, the group on Telegram can send you a small amount for free.
            </p>
          </div>
        </div>

        {/* Current balance status */}
        {account ? (
          <>
            <div className={`gas-balance ${hasGas ? 'gas-balance--ok' : 'gas-balance--low'}`}>
              <div>
                <p className="eyebrow">Your Celo address</p>
                <p className="title-md num" style={{ marginTop: 4 }}>
                  {shortAddress(account)}
                </p>
                {celoBalance != null && (
                  <p className="copy" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    Balance:{' '}
                    <strong>
                      {celoBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} CELO
                    </strong>{' '}
                    {hasGas ? '✓ enough to play' : '— not enough to play'}
                  </p>
                )}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={copy} aria-label="Copy wallet address">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {!hasGas && (
              <div className="notice warn" style={{ marginTop: 10 }}>
                <Fuel size={14} />
                Your wallet needs a little CELO before you can play. Follow the steps below.
              </div>
            )}
          </>
        ) : (
          <div className="gas-no-wallet">
            <Wallet size={20} />
            <p>
              Connect your wallet in the app first so we can show your address here and include it in your Telegram
              request.
            </p>
            <Link href="/" className="btn btn-ghost btn-sm">
              Go to app
            </Link>
          </div>
        )}

        {/* Steps */}
        <ol className="gas-steps">
          <li>
            {account ? (
              <>
                Copy your Celo address above with the{' '}
                <strong>Copy</strong> button.
              </>
            ) : (
              <>Connect your wallet in the app, then come back here.</>
            )}
          </li>
          <li>Open the Telegram group and paste your address in a message asking for a little CELO.</li>
          <li>Once a small amount arrives, return to the app and start playing.</li>
        </ol>

        <a className="btn btn-primary btn-block" href={telegramGasUrl} target="_blank" rel="noreferrer">
          <Send size={18} /> Open Telegram group
        </a>
        <Link href="/" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
          Back to Xurri
        </Link>
      </div>
    </main>
  );
}
