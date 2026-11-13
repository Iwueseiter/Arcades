'use client';

import { Wallet } from 'lucide-react';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { toast } from '@/lib/toast-store';

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
    try {
      await connect();
      toast.success('Wallet connected', 'You\u2019re signed in and ready to play.');
      onConnected?.();
    } catch (error) {
      toast.error('Couldn\u2019t connect', describeError(error));
    }
  };

  // No wallet detected — still show the button, clicking it will prompt them to install one
  if (!hasProvider) {
    return (
      <button
        type="button"
        className={`btn btn-primary ${block ? 'btn-block' : 'btn-sm'}`}
        onClick={onClick}
        disabled={status !== 'idle'}
      >
        <Wallet size={18} /> {label}
      </button>
    );
  }

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
