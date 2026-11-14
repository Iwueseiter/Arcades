'use client';

import { Wallet } from 'lucide-react';
import { custom, getAddress } from 'viem';
import { createWalletClient } from 'viem';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { chainConfig } from '@/lib/chain/config';
import { getMagic } from '@/lib/magic';
import { api } from '@/lib/api';
import { usePlayerStore } from '@/lib/player-store';
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
  const status = useWalletStore((s) => s.status);
  const hasProvider = useWalletStore((s) => s.hasProvider);
  const connectNative = useWalletStore((s) => s.connect);

  const onClick = async () => {
    // If window.ethereum exists (inside a wallet browser), use the native connect flow.
    if (hasProvider) {
      try {
        await connectNative();
        toast.success('Wallet connected', 'You\u2019re signed in and ready to play.');
        onConnected?.();
      } catch (error) {
        toast.error('Couldn\u2019t connect', describeError(error));
      }
      return;
    }

    // No injected wallet — use Magic's connectWithUI which shows a WalletConnect modal.
    // The user can connect MetaMask, GoodDollar, Trust, or any WalletConnect wallet.
    useWalletStore.setState({ status: 'connecting' });
    try {
      const magic = getMagic();

      // Opens Magic's wallet connection modal (WalletConnect-powered).
      await magic.wallet.connectWithUI();

      // Magic's provider is now connected — use it as the EIP-1193 provider.
      const provider = magic.rpcProvider as unknown as {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };

      const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
      if (!accounts[0]) throw new Error('No account returned from wallet.');
      const account = getAddress(accounts[0]);

      useWalletStore.setState({ status: 'signing' });

      const { message } = await api.nonce(account);
      const walletClient = createWalletClient({
        account,
        chain: chainConfig.chain,
        transport: custom(provider as Parameters<typeof custom>[0]),
      });
      const signature = await walletClient.signMessage({ account, message });
      const player = await api.verify(account, signature);

      usePlayerStore.getState().setPlayer(player);
      useWalletStore.setState({ account, hasProvider: true });
      await useWalletStore.getState().refreshChain();

      toast.success('Wallet connected', 'You\u2019re signed in and ready to play.');
      onConnected?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
        toast.error('Couldn\u2019t connect', msg || 'Please try again.');
      }
    } finally {
      useWalletStore.setState({ status: 'idle' });
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
