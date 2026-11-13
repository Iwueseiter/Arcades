'use client';

import { Wallet } from 'lucide-react';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { toast } from '@/lib/toast-store';

export function ConnectButton({
  block = false,
  label = 'Connect wallet',
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
      toast.success('Wallet connected', 'You can now play and claim G$ once you’re verified.');
      onConnected?.();
    } catch (error) {
      toast.error('Couldn’t connect', describeError(error));
    }
  };

  if (!hasProvider) {
    return (
      <a className={`btn btn-ghost ${block ? 'btn-block' : 'btn-sm'}`} href="https://wallet.gooddollar.org" target="_blank" rel="noreferrer">
        <Wallet size={18} /> Get a wallet
      </a>
    );
  }

  return (
    <button type="button" className={`btn btn-primary ${block ? 'btn-block' : 'btn-sm'}`} onClick={onClick} disabled={status !== 'idle'}>
      {status !== 'idle' ? <span className="spinner" /> : <Wallet size={18} />}
      {label}
    </button>
  );
}
