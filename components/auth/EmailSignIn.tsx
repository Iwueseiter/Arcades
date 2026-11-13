'use client';

import { useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { getMagic } from '@/lib/magic';
import { api } from '@/lib/api';
import { usePlayerStore } from '@/lib/player-store';
import { toast } from '@/lib/toast-store';

/**
 * Email sign-in via Magic (magic.link).
 * Magic handles sending the OTP email and showing the code-entry UI.
 * Once the user verifies, we get a DIDToken and exchange it for a session.
 */
export function EmailSignIn({ compact = false }: { compact?: boolean }) {
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      // Magic opens its own OTP modal — sends the email, collects the code, returns a DIDToken.
      const didToken = await getMagic().auth.loginWithEmailOTP({ email: email.trim() });
      if (!didToken) throw new Error('Sign-in was cancelled.');

      // Exchange the DIDToken for an Xurri session.
      const player = await api.verifyOtp(didToken);
      setPlayer(player);
      toast.success('Signed in', 'Welcome to Xurri!');
    } catch (error) {
      // Magic throws when the user dismisses the modal — treat that silently.
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
        {loading ? 'Sending code\u2026' : 'Sign in'}
      </button>
    </form>
  );
}
