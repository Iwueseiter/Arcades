'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { EmailSignIn } from '@/components/auth/EmailSignIn';
import { Logo } from '@/components/brand/Logo';
import { TokenArt } from '@/components/game/TokenArt';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { isSignedIn } from '@/lib/access';
import { useWalletStore } from '@/lib/chain/wallet-store';
import { shortAddress } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';

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

/** Sign-in screen: email or wallet. Names are set later on the profile. */
export function Welcome({ onDone, standalone = false }: { onDone: () => void; standalone?: boolean }) {
  const player = usePlayerStore((s) => s.player);
  const refresh = usePlayerStore((s) => s.refresh);
  const initWallet = useWalletStore((s) => s.init);

  // On its own route the app shell isn't mounted, so load the player and wallet here.
  useEffect(() => {
    if (!standalone) return;
    void refresh().then(() => initWallet());
  }, [standalone, refresh, initWallet]);

  useEffect(() => {
    if (!isSignedIn(player)) return;
    markWelcomed();
    onDone();
  }, [player?.address, player?.signedInEmail, onDone, player]);

  const finish = () => {
    markWelcomed();
    onDone();
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

        <div className="welcome-card">
          {player?.signedInEmail ? (
            <p className="welcome-connected">
              <Check size={16} /> Signed in as {player.signedInEmail}
            </p>
          ) : (
            <EmailSignIn />
          )}

          <div className="welcome-or">
            <span>or</span>
          </div>

          {player?.address ? (
            <p className="welcome-connected">
              <Check size={16} /> Wallet connected · {shortAddress(player.address)}
            </p>
          ) : (
            <ConnectButton block label="Connect wallet" onConnected={finish} />
          )}

          <p className="welcome-note">
            By continuing you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy</Link>{' '}
            notes.
          </p>
        </div>
      </div>
    </div>
  );
}
