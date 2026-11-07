'use client';

import { useEffect, useState } from 'react';
import { AudioManager } from '@/components/audio/AudioManager';
import { GameArena } from '@/components/game/GameArena';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { useGameStore } from '@/lib/game-store';
import { useLeaderboardStore } from '@/lib/leaderboard-store';
import { useWalletStore } from '@/lib/wallet-store';
import { Coins, Gift, Sparkles, Trophy, Zap } from 'lucide-react';

const shopItems = [
  { id: 'starter-pack', name: 'Starter Pack', price: 5, accent: 'gold', blurb: 'Boost your first run with 10 bonus tokens.' },
  { id: 'combo-boost', name: 'Combo Boost', price: 12, accent: 'mint', blurb: 'Double tap streak rewards for 3 rounds.' },
  { id: 'lucky-capsule', name: 'Lucky Capsule', price: 18, accent: 'violet', blurb: 'Chance to unlock a rare fade effect skin.' },
  { id: 'vip-pass', name: 'VIP Pass', price: 25, accent: 'coral', blurb: 'Priority reward queue and daily drop boost.' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('Play');
  const { balance, purchases, buyItem, addBalance, syncFromServer: syncWallet } = useWalletStore();
  const { entries, updateScore, syncFromServer: syncLeaderboard } = useLeaderboardStore();
  const { bestScore, streak, roundsUsed, totalRounds } = useGameStore();

  useEffect(() => {
    void syncWallet();
    void syncLeaderboard();
  }, [syncWallet, syncLeaderboard]);

  useEffect(() => {
    if (bestScore > 0) {
      updateScore('You', bestScore);
    }
  }, [bestScore, updateScore]);

  const roundsLeft = Math.max(0, totalRounds - roundsUsed);
  const statItems = [
    { label: 'Rounds left', value: String(roundsLeft), icon: Sparkles },
    { label: 'Best score', value: bestScore.toLocaleString(), icon: Trophy },
    { label: 'Reward pool', value: '27 G$', icon: Coins },
    { label: 'Streak', value: `x${Math.max(1, streak > 0 ? Math.min(4, Math.floor(streak / 10) + 1) : 1)}`, icon: Zap },
  ];

  const renderContent = () => {
    if (activeTab === 'Shop') {
      return (
        <>
          <GlassCard className="p-4">
            <div className="section-header">
              <div>
                <p className="eyebrow">Arcade boost</p>
                <h1 className="headline-xl">Shop</h1>
              </div>
              <div className="pill pill-gold">{balance.toFixed(1)} G$</div>
            </div>
          </GlassCard>

          <div className="shop-grid">
            {shopItems.map((item) => {
              const owned = purchases.includes(item.id);
              return (
                <GlassCard key={item.id} className="shop-item p-4">
                  <div className={`shop-badge ${item.accent}`} />
                  <div className="shop-item-header">
                    <div>
                      <p className="eyebrow">Limited</p>
                      <h2 className="headline-md">{item.name}</h2>
                    </div>
                    <div className="shop-price">{item.price} G$</div>
                  </div>
                  <p className="shop-copy">{item.blurb}</p>
                  <button
                    type="button"
                    className="btn btn-primary shop-action"
                    onClick={() => buyItem(item.id, item.price)}
                    disabled={owned || balance < item.price}
                  >
                    {owned ? 'Owned' : 'Buy now'}
                  </button>
                </GlassCard>
              );
            })}
          </div>
        </>
      );
    }

    if (activeTab === 'Ranks') {
      return (
        <GlassCard className="p-4">
          <p className="eyebrow">Leaderboard</p>
          <h1 className="headline-xl">Top 5 today</h1>
          <div className="rank-list">
            {entries.map((entry, index) => (
              <div key={`${entry.name}-${index}`} className="rank-row">
                <span>
                  #{index + 1} {entry.badge} {entry.name}
                </span>
                <strong>{entry.score.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </GlassCard>
      );
    }

    if (activeTab === 'Invite') {
      return (
        <GlassCard className="p-4">
          <p className="eyebrow">Referrals</p>
          <h1 className="headline-xl">Invite friends</h1>
          <div className="referral-box">
            <Gift size={18} />
            <span>Share your code: GOODTAP-32</span>
          </div>
          <div className="reward-box">
            <div>
              <p className="eyebrow">Daily reward</p>
              <strong>+2.4 G$</strong>
            </div>
            <button type="button" className="btn btn-primary reward-button" onClick={() => addBalance(2.4)}>
              Claim
            </button>
          </div>
        </GlassCard>
      );
    }

    return (
      <>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Today&apos;s run</p>
              <h1 className="headline-xl">Ready to tap?</h1>
            </div>
            <div className="pill pill-gold">+ 2.4 G$</div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {statItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="status-tile rounded-3xl px-3 py-4">
                <Icon size={18} />
                <div className="mt-3 text-lg font-extrabold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GameArena />
      </>
    );
  };

  return (
    <main className="page-shell">
      <div className="page-frame">
        <TopBar balance={balance} rounds={Array.from({ length: totalRounds }, (_, index) => index + 1)} soundEnabled />

        <section className="stack gap-4 px-4 pb-24 pt-3">{renderContent()}</section>

        <BottomNav activeTab={activeTab} onSelect={setActiveTab} />
      </div>

      <AudioManager />
    </main>
  );
}
