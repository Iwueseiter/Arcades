'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioManager } from '@/components/audio/AudioManager';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { BottomNav } from '@/components/shell/BottomNav';
import { TopBar } from '@/components/shell/TopBar';
import { TxOverlay } from '@/components/shell/TxOverlay';
import { Toaster } from '@/components/ui/Toaster';
import { Welcome, markWelcomed } from '@/components/onboarding/Welcome';
import { PlayView } from '@/components/views/PlayView';
import { ProfileView } from '@/components/views/ProfileView';
import { RanksView } from '@/components/views/RanksView';
import { RewardsView } from '@/components/views/RewardsView';
import { ShopView } from '@/components/views/ShopView';
import { useGameStore } from '@/lib/game-store';
import { usePlayerStore } from '@/lib/player-store';
import { useWalletStore } from '@/lib/chain/wallet-store';
import { isSignedIn } from '@/lib/access';
import { toast } from '@/lib/toast-store';

export type TabId = 'play' | 'ranks' | 'shop' | 'rewards' | 'me';

export function AppShell({ initialTab }: { initialTab: TabId }) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const refresh = usePlayerStore((s) => s.refresh);
  const initWallet = useWalletStore((s) => s.init);
  const inRound = useGameStore((s) => s.status !== 'idle');
  const player = usePlayerStore((s) => s.player);

  // null = still loading | true = guest (show sign-in) | false = signed in (show app)
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  // Arriving from a magic-link email redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signedin') !== 'email') return;
    markWelcomed();
    toast.success('You\u2019re signed in', 'Your progress is saved to your email.');
    params.delete('signedin');
    window.history.replaceState(null, '', params.size ? `/?${params}` : '/');
  }, []);

  // Load the player then initialise the wallet.
  useEffect(() => {
    void refresh().then(() => initWallet());
  }, [refresh, initWallet]);

  // Safety net: if loading takes more than 6 seconds, force to sign-in screen.
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome((prev) => (prev === null ? true : prev));
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Once we know who the player is, decide what to show.
  useEffect(() => {
    if (!player) return; // still loading — keep the blank screen
    setShowWelcome(!isSignedIn(player));
  }, [player]);

  const selectTab = (next: TabId) => {
    setTab(next);
    const url = next === 'play' ? '/' : `/?tab=${next}`;
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0 });
  };

  // ── Loading — blank screen while /api/me resolves ──────────────────────────
  if (showWelcome === null) {
    return (
      <main className="app-shell">
        <div className="app-frame app-frame--loading" aria-label="Loading" aria-busy="true" />
        <Toaster />
      </main>
    );
  }

  // ── Guest — sign-in screen, nothing else visible ───────────────────────────
  if (showWelcome) {
    return (
      <main className="app-shell">
        <Welcome standalone onDone={() => setShowWelcome(false)} />
        <Toaster />
        <AudioManager />
      </main>
    );
  }

  // ── Signed in — full app ───────────────────────────────────────────────────
  return (
    <main className="app-shell">
      <PageViewTracker path={tab === 'play' ? '/' : `/?tab=${tab}`} />
      <div className="app-frame">
        <TopBar onOpenProfile={() => selectTab('me')} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={tab}
            className="app-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'play' && <PlayView onNavigate={selectTab} />}
            {tab === 'ranks' && <RanksView onNavigate={selectTab} />}
            {tab === 'shop' && <ShopView />}
            {tab === 'rewards' && <RewardsView onNavigate={selectTab} />}
            {tab === 'me' && <ProfileView />}
          </motion.section>
        </AnimatePresence>
        {!inRound && <BottomNav active={tab} onSelect={selectTab} />}
      </div>
      <TxOverlay />
      <Toaster />
      <AudioManager />
    </main>
  );
}
