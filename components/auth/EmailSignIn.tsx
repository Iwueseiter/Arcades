'use client';

import { useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { getAddress, isAddress } from 'viem';
import { getMagic } from '@/lib/magic';
import { api } from '@/lib/api';
import { usePlayerStore } from '@/lib/player-store';
import { useWalletStore } from '@/lib/chain/wallet-store';
import { toast } from '@/lib/toast-store';

/**
 * Two-step email sign-in via Magic.
 * Magic sends the OTP, verifies it, and creates a non-custodial wallet for the user.
 * That wallet address is saved to the player and used for on-chain game transactions.
 */
export function EmailSignIn({ compact = false }: { compact?: boolean }) {
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      // Magic opens its OTP modal, sends the email, collects the code, returns a DIDToken.
      const didToken = await getMagic().auth.loginWithEmailOTP({ email: email.trim() });
      if (!didToken) throw new Error('Sign-in was cancelled.');

      // Exchange DIDToken for an Xurri session — server saves the Magic wallet address.
      const player = await api.verifyOtp(didToken);
      setPlayer(player);

      // Seed the wallet store with the Magic-created address so the play screen works.
      if (player.address && isAddress(player.address)) {
        const account = getAddress(player.address);
        useWalletStore.setState({ account, hasProvider: false });
        // Load on-chain balances in the background.
        void useWalletStore.getState().refreshChain();
      }

      toast.success('Signed in', 'Welcome to Xurri!');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
        toast.error('Sign-in failed', msg || 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="email-signin" onSubmit={signIn}>
      {!compact && (
        <label htmlFor="signin-email" className="email-signin-label">
          Email
        </label>
      )}
      <input
        id="signin-email"
        className="input"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={loading || !email.includes('@')}
      >
        {loading ? <span className="spinner" /> : <Mail size={18} />}
        {loading ? 'Signing in\u2026' : 'Sign in'}
      </button>
    </form>
  );
}
