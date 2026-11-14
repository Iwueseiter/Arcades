'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useRef } from 'react';
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi';
import { celo } from 'viem/chains';
import { useWalletStore } from '@/lib/chain/wallet-store';
import { usePlayerStore } from '@/lib/player-store';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast-store';
import { describeError } from '@/lib/chain/wallet-store';

/**
 * After RainbowKit connects a wallet, this signs the user into the Xurri
 * session (SIWE-style nonce sign). Runs once per newly-connected address.
 */
function WalletSyncEffect() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  // Guard against double-runs for the same address
  const signingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;

    const key = address.toLowerCase();
    // Already handled this address
    if (signingRef.current === key) return;
    // Already signed in with this address
    const player = usePlayerStore.getState().player;
    if (player?.address?.toLowerCase() === key) return;

    signingRef.current = key;

    const signIn = async () => {
      useWalletStore.setState({ status: 'signing' });
      try {
        // Switch to Celo before signing — MetaMask defaults to Ethereum
        await switchChainAsync({ chainId: celo.id }).catch(() => null);

        const { message } = await api.nonce(address);
        const signature = await signMessageAsync({ message });
        const signedPlayer = await api.verify(address, signature);

        setPlayer(signedPlayer);
        useWalletStore.setState({ account: address, hasProvider: true });
        void useWalletStore.getState().refreshChain();
        toast.success('Wallet connected', 'You\u2019re signed in and ready to play.');
      } catch (error) {
        signingRef.current = null; // allow retry on error
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
    // Only re-run when address or connection state changes — NOT on chainId
  }, [isConnected, address]); // eslint-disable-line

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

  useEffect(() => {
    if (account && player?.address) onConnected?.();
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
