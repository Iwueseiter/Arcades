'use client';

import { motion } from 'framer-motion';
import { Gamepad2, Gift, ShoppingBag, Trophy, UserRound } from 'lucide-react';
import type { TabId } from '@/components/shell/AppShell';
import { useHasClaimableReward } from '@/lib/use-economy';

const tabs: { id: TabId; label: string; icon: typeof Gamepad2 }[] = [
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'ranks', label: 'Ranks', icon: Trophy },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'me', label: 'Me', icon: UserRound },
];

export function BottomNav({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  const hasReward = useHasClaimableReward();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className="nav-item" aria-current={id === active ? 'page' : undefined} onClick={() => onSelect(id)}>
          {id === active && <motion.span layoutId="nav-indicator" className="nav-indicator" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <Icon size={21} strokeWidth={id === active ? 2.5 : 2} />
          <span>{label}</span>
          {id === 'rewards' && hasReward && <i className="nav-dot" aria-label="Reward ready" />}
        </button>
      ))}
    </nav>
  );
}
