'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { EmailSignIn } from '@/components/auth/EmailSignIn';
import { Logo } from '@/components/brand/Logo';
import { TokenArt } from '@/components/game/TokenArt';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { api } from '@/lib/api';
import { useWalletStore } from '@/lib/chain/wallet-store';
import { shortAddress } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';
import { toast } from '@/lib/toast-store';

export const WELCOMED_KEY = 'xurri-welcomed';

export function markWelcomed() {
  try {
    localStorage.setItem(WELCOMED_KEY, '1');
  } catch {
    // storage blocked: the welcome screen may just show again next time
  }
}

export function hasBeenWelcomed() {
  try {
    return localStorage.getItem(WELCOMED_KEY) === '1';
  } catch {
    return true;
  }
}

/** Sign-in screen: pick a name and play, or connect a wallet to claim free daily G$. */
export function Welcome({ onDone, standalone = false }: { onDone: () => void; standalone?: boolean }) {
  const player = usePlayerStore((s) => s.player);
  const refresh = usePlayerStore((s) => s.refresh);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const initWallet = useWalletStore((s) => s.init);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // On its own route the app shell isn't mounted, so load the player and wallet here.
  useEffect(() => {
    if (!standalone) return;
    void refresh().then(() => initWallet());
  }, [standalone, refresh, initWallet]);

  useEffect(() => {
    if (player?.name) setName(player.name);
  }, [player?.name]);

  const start = async (event?: FormEvent) => {
    event?.preventDefault();
    setSaving(true);
    try {
      if (name.trim() && name.trim() !== player?.name) setPlayer(await api.updateMe({ name: name.trim() }));
      markWelcomed();
      onDone();
    } catch (error) {
      toast.error('That name didn’t work', error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="welcome">
      <div className="hero-sun" aria-hidden />
      <div className="hero-cloud c1" aria-hidden />
      <div className="hero-cloud c2" aria-hidden />
      {(['coin', 'jelly-drop', 'bubble', 'candy'] as const).map((skin, i) => (
        <motion.span
          key={skin}
          className={`welcome-treat t${i}`}
          animate={{ y: [0, -10, 0], rotate: [-8, 8, -8] }}
          transition={{ repeat: Infinity, duration: 3, delay: i * 0.4, ease: 'easeInOut' }}
          aria-hidden
        >
          <TokenArt skin={skin} />
        </motion.span>
      ))}

      <div className="welcome-inner">
        <motion.h1 className="welcome-brand" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
          <Logo />
        </motion.h1>
        <p className="welcome-tag">Pop treats. Win G$.</p>


        <form className="welcome-card" onSubmit={start}>
          <label htmlFor="welcome-name" className="welcome-label">
            What should we call you?
          </label>
          <input
            id="welcome-name"
            className="input"
            value={name}
            maxLength={20}
            placeholder="Your name"
            autoComplete="nickname"
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-block" disabled={saving || !player}>
            {saving ? <span className="spinner" /> : 'Let’s play!'}
          </button>

          <div className="welcome-or">
            <span>or</span>
          </div>

          {player?.address ? (
            <p className="welcome-connected">
              <Check size={16} /> Wallet connected · {shortAddress(player.address)}
            </p>
          ) : (
            <ConnectButton block label="Connect wallet" />
          )}
        </form>

        <div className="welcome-card welcome-email">
          {player?.signedInEmail ? (
            <p className="welcome-connected">
              <Check size={16} /> Signed in as {player.signedInEmail}
            </p>
          ) : (
            <EmailSignIn />
          )}
          <p className="welcome-note">
            Connect a wallet for free daily G$, or sign in with email to keep your progress on any device. By playing you
            agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy</Link> notes.
          </p>
        </div>
      </div>
    </div>
  );
}
