'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useWalletStore } from '@/lib/chain/wallet-store';
import { usePlayerStore } from '@/lib/player-store';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast-store';
import { describeError } from '@/lib/chain/wallet-store';

/**
 * Wraps RainbowKit's ConnectButton to hook wallet connection into the Xurri
 * session system (SIWE-style sign-in) while showing the full wallet picker modal.
 */
function WalletSyncEffect() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const setPlayer = usePlayerStore((s) => s.setPlayer);

  useEffect(() => {
    if (!isConnected || !address) return;
    // Already signed in with this address — no need to re-auth
    const player = usePlayerStore.getState().player;
    if (player?.address?.toLowerCase() === address.toLowerCase()) return;

    const signIn = async () => {
      useWalletStore.setState({ status: 'signing', account: address });
      try {
        const { message } = await api.nonce(address);
        const signature = await signMessageAsync({ message });
        const player = await api.verify(address, signature);
        setPlayer(player);
        useWalletStore.setState({ account: address });
        await useWalletStore.getState().refreshChain();
        toast.success('Wallet connected', 'You\u2019re signed in and ready to play.');
      } catch (error) {
        useWalletStore.setState({ account: null, status: 'idle' });
        const msg = error instanceof Error ? error.message : '';
        if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('user rejected')) {
          toast.error('Sign-in failed', describeError(error));
        }
      } finally {
        useWalletStore.setState({ status: 'idle' });
      }
    };

    void signIn();
  }, [isConnected, address, signMessageAsync, setPlayer]);

  return null;
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
  const player = usePlayerStore((s) => s.player);
  const account = useWalletStore((s) => s.account);

  // Once signed in, call onConnected
  useEffect(() => {
    if (account && player?.address) {
      onConnected?.();
    }
  }, [account, player?.address, onConnected]);

  return (
    <>
      <WalletSyncEffect />
      <RainbowConnectButton.Custom>
        {({ openConnectModal, connectModalOpen }) => (
          <button
            type="button"
            className={`btn btn-primary ${block ? 'btn-block' : 'btn-sm'}`}
            onClick={openConnectModal}
            disabled={connectModalOpen}
          >
            {connectModalOpen ? <span className="spinner" /> : null}
            {label}
          </button>
        )}
      </RainbowConnectButton.Custom>
    </>
  );
}
