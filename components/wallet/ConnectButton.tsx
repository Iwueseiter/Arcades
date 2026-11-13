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
    if (!hasProvider) {
      toast.error(
        'No wallet found',
        'Open Xurri inside a wallet app (e.g. GoodDollar or MetaMask), or install a browser wallet extension.',
      );
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
