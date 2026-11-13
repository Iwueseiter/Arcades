'use client';

import { Fuel, Send } from 'lucide-react';
import { telegramGasUrl } from '@/lib/access';
import { useWalletStore } from '@/lib/chain/wallet-store';

/** Builds a Telegram link that pre-fills the user's wallet address as the message. */
function useTelegramUrl() {
  const account = useWalletStore((s) => s.account);
  if (!account) return telegramGasUrl;
  const msg = `Hi, I need a little CELO for gas fees to play Xurri. My wallet address is: ${account}`;
  return `${telegramGasUrl}?text=${encodeURIComponent(msg)}`;
}

/** Points a player with an empty CELO wallet to the Telegram group to request gas. */
export function CeloGasHelp({ compact = false }: { compact?: boolean }) {
  const telegramUrl = useTelegramUrl();

  if (compact) {
    return (
      <p className="hero-meta">
        You need a little CELO for network fees.{' '}
        <a href={telegramUrl} target="_blank" rel="noreferrer">
          Request on Telegram
        </a>
      </p>
    );
  }

  return (
    <div className="notice warn" style={{ marginTop: 12 }}>
      <Fuel size={18} />
      <div>
        Playing uses a tiny CELO network fee. Join the Telegram group and ask for a small amount.
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <a className="btn btn-primary btn-sm" href={telegramUrl} target="_blank" rel="noreferrer">
            <Send size={14} /> Request CELO on Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
