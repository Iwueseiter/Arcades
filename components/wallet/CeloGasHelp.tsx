'use client';

import Link from 'next/link';
import { Fuel, Send } from 'lucide-react';
import { telegramGasUrl } from '@/lib/access';

/** Points a player with an empty CELO wallet to the Telegram gas request page. */
export function CeloGasHelp({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="hero-meta">
        You need a little CELO for network fees.{' '}
        <Link href="/gas">Request CELO on Telegram</Link>
      </p>
    );
  }

  return (
    <div className="notice warn" style={{ marginTop: 12 }}>
      <Fuel size={18} />
      <div>
        Playing uses a tiny CELO network fee. If your wallet has none, ask the community for gas.
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Link href="/gas" className="btn btn-primary btn-sm">
            Request CELO
          </Link>
          <a className="btn btn-ghost btn-sm" href={telegramGasUrl} target="_blank" rel="noreferrer">
            <Send size={14} /> Open Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
