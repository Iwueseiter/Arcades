'use client';

import { useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { toast } from '@/lib/toast-store';

/** Deep links that open Xurri inside the wallet's built-in browser. */
function walletDeepLinks(appUrl: string) {
  const encoded = encodeURIComponent(appUrl);
  return [
    {
      name: 'MetaMask',
      href: `https://metamask.app.link/dapp/${appUrl.replace(/^https?:\/\//, '')}`,
      icon: '🦊',
    },
    {
      name: 'GoodDollar',
      href: `https://wallet.gooddollar.org/AppNavigation/WalletNavigation/Profile?redirect=${encoded}`,
      icon: '🌍',
    },
    {
      name: 'Trust Wallet',
      href: `https://link.trustwallet.com/open_url?coin_id=60&url=${encoded}`,
      icon: '🛡️',
    },
  ];
}

function WalletPickerModal({ onClose }: { onClose: () => void }) {
  const appUrl = typeof window !== 'undefined' ? window.location.href : '';
  const links = walletDeepLinks(appUrl);

  return (
    <div className="wallet-modal-backdrop" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-head">
          <p className="wallet-modal-title">Open in your wallet</p>
          <button type="button" className="wallet-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="wallet-modal-hint">
          Choose your wallet app to sign in. It will open Xurri inside its built-in browser where your wallet is available.
        </p>
        <div className="wallet-modal-list">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="wallet-modal-item"
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
            >
              <span className="wallet-modal-icon">{link.icon}</span>
              <span>{link.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConnectButton({
  block = false,
  label = 'Sign in with wallet',
  onConnected,
}: {
  block?: boolean;
  label?: string;
  onConnected?: () => void;
}) {
  const connect = useWalletStore((s) => s.connect);
  const status = useWalletStore((s) => s.status);
  const hasProvider = useWalletStore((s) => s.hasProvider);
  const [showPicker, setShowPicker] = useState(false);

  const onClick = async () => {
    if (!hasProvider) {
      setShowPicker(true);
      return;
    }
    try {
      await connect();
      toast.success('Wallet connected', 'You\u2019re signed in and ready to play.');
      onConnected?.();
    } catch (error) {
      toast.error('Couldn\u2019t connect', describeError(error));
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn btn-primary ${block ? 'btn-block' : 'btn-sm'}`}
        onClick={onClick}
        disabled={status !== 'idle'}
      >
        {status !== 'idle' ? <span className="spinner" /> : <Wallet size={18} />}
        {label}
      </button>
      {showPicker && <WalletPickerModal onClose={() => setShowPicker(false)} />}
    </>
  );
}
