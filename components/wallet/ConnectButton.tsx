'use client';

import { Wallet } from 'lucide-react';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { toast } from '@/lib/toast-store';

/** On mobile without window.ethereum, redirect to open Xurri inside the GoodDollar wallet app. */
function openInWalletApp() {
  const appUrl = window.location.href;
  // GoodDollar wallet deep link — opens the app and loads the URL inside its browser.
  // Falls back to the app store page if not installed.
  const deepLink = `https://wallet.gooddollar.org/AppNavigation/WalletNavigation/Profile?redirect=${encodeURIComponent(appUrl)}`;
  window.location.href = deepLink;
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

  const onClick = async () => {
    if (!hasProvider) {
      // On mobile: redirect to open this page inside a wallet browser
      openInWalletApp();
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
    <button
      type="button"
      className={`btn btn-primary ${block ? 'btn-block' : 'btn-sm'}`}
      onClick={onClick}
      disabled={status !== 'idle'}
    >
      {status !== 'idle' ? <span className="spinner" /> : <Wallet size={18} />}
      {label}
    </button>
  );
}
