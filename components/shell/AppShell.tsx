'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioManager } from '@/components/audio/AudioManager';
import { BottomNav } from '@/components/shell/BottomNav';
import { TopBar } from '@/components/shell/TopBar';
import { TxOverlay } from '@/components/shell/TxOverlay';
import { Toaster } from '@/components/ui/Toaster';
import { PlayView } from '@/components/views/PlayView';
import { ProfileView } from '@/components/views/ProfileView';
import { RanksView } from '@/components/views/RanksView';
import { RewardsView } from '@/components/views/RewardsView';
import { ShopView } from '@/components/views/ShopView';
import { useGameStore } from '@/lib/game-store';
import { usePlayerStore } from '@/lib/player-store';
import { useWalletStore } from '@/lib/chain/wallet-store';

export type TabId = 'play' | 'ranks' | 'shop' | 'rewards' | 'me';

export const REFERRER_KEY = 'goodtap-referrer';

export function AppShell({ initialTab, referrer }: { initialTab: TabId; referrer: string | null }) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const refresh = usePlayerStore((s) => s.refresh);
  const initWallet = useWalletStore((s) => s.init);
  const inRound = useGameStore((s) => s.status === 'playing' || s.status === 'countdown');

  useEffect(() => {
    void refresh().then(() => initWallet());
  }, [refresh, initWallet]);

  useEffect(() => {
    if (!referrer) return;
    try {
      localStorage.setItem(REFERRER_KEY, referrer);
    } catch {
      // storage can be unavailable in private mode; the invite just won't be remembered
    }
  }, [referrer]);

  const selectTab = (next: TabId) => {
    setTab(next);
    const url = next === 'play' ? '/' : `/?tab=${next}`;
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="app-shell">
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
            {tab === 'rewards' && <RewardsView />}
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
