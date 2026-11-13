'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, Copy, Fuel, Send } from 'lucide-react';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { Logo } from '@/components/brand/Logo';
import { hasCeloForGas, MIN_CELO_GAS, telegramGasUrl } from '@/lib/access';
import { usePlayerStore } from '@/lib/player-store';
import { useWalletStore } from '@/lib/chain/wallet-store';

export default function GasPage() {
  const account = useWalletStore((s) => s.account);
  const celoBalance = useWalletStore((s) => s.chainState?.celoBalance);
  const refreshChain = useWalletStore((s) => s.refreshChain);
  const refreshPlayer = usePlayerStore((s) => s.refresh);
  const initWallet = useWalletStore((s) => s.init);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build Telegram URL with wallet address pre-filled
  const telegramUrl = account
    ? `${telegramGasUrl}?text=${encodeURIComponent(`Hi, I need a little CELO for gas fees to play Xurri. My wallet address is: ${account}`)}`
    : telegramGasUrl;

  // Load player + wallet on mount
  useEffect(() => {
    void refreshPlayer().then(() => initWallet());
  }, [refreshPlayer, initWallet]);

  const hasGas = hasCeloForGas(celoBalance);

  // Poll balance every 5s while CELO is still needed
  useEffect(() => {
    if (hasGas || !account) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      void refreshChain();
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasGas, account, refreshChain]);

  // Auto-redirect to the game once CELO arrives
  useEffect(() => {
    if (hasGas && account) {
      const timer = setTimeout(() => {
        window.location.href = '/';
      }, 1800); // brief pause so the success state is visible
      return () => clearTimeout(timer);
    }
  }, [hasGas, account]);

  const copy = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="gas-page">
      <PageViewTracker path="/gas" />
      <div className="gas-card">
        <Logo />

        {/* CELO received — success state */}
        {hasGas ? (
          <div className="gas-success">
            <CheckCircle2 size={40} className="gas-success-icon" />
            <h2 className="gas-success-title">You&apos;re good to go!</h2>
            <p className="gas-success-body">
              Your wallet has{' '}
              <strong>{celoBalance?.toLocaleString(undefined, { maximumFractionDigits: 6 })} CELO</strong>{' '}
              — enough to start playing.
            </p>
            <Link href="/" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>
              Go play
            </Link>
          </div>
        ) : (
          <>
            {/* Why CELO is needed */}
            <div className="gas-why">
              <span className="gas-why-icon" aria-hidden>
                <Fuel size={18} />
              </span>
              <div>
                <p className="gas-why-title">CELO needed to play</p>
                <p className="gas-why-body">
                  Every game costs a tiny network fee in CELO — less than{' '}
                  <strong>{MIN_CELO_GAS.toLocaleString(undefined, { maximumSignificantDigits: 2 })} CELO</strong>.
                  Drop your address in the Telegram group and someone will top you up for free.
                </p>
              </div>
            </div>

            {/* Wallet address — full address for easy copy */}
            {account ? (
              <div className="gas-balance gas-balance--low">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="eyebrow" style={{ marginBottom: 6 }}>Your Celo address</p>
                  <p className="gas-full-address num">{account}</p>
                  {celoBalance != null && (
                    <p className="copy" style={{ fontSize: '0.78rem', marginTop: 6, color: 'var(--muted)' }}>
                      Balance: <strong>{celoBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} CELO</strong>
                      {' \u2014 '}checking every 5s
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={copy}
                  aria-label="Copy wallet address"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ) : (
              <div className="gas-no-wallet">
                <p>Sign in first so we can show your wallet address here.</p>
                <Link href="/" className="btn btn-ghost btn-sm">Go to app</Link>
              </div>
            )}

            {/* Steps */}
            <ol className="gas-steps">
              <li>Copy your Celo address above.</li>
              <li>Open the Telegram group and paste your address — ask for a little CELO for gas.</li>
              <li>This page checks your balance automatically. Once CELO arrives, you&apos;ll be taken to the game.</li>
            </ol>

            <a className="btn btn-primary btn-block" href={telegramUrl} target="_blank" rel="noreferrer">
              <Send size={18} /> Open Telegram group
            </a>
            <Link href="/" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>
              Back to Xurri
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
