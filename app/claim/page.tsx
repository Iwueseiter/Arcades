'use client';

import Link from 'next/link';
import { CheckCircle2, Coins, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useProfileStore } from '@/lib/profile-store';
import { useWalletStore } from '@/lib/wallet-store';

export default function ClaimPage() {
  const { claimDaily, dailyReward, lastClaimDate, streak, verified } = useProfileStore();
  const { addBalance, balance } = useWalletStore();
  const todayKey = new Date().toISOString().slice(0, 10);
  const alreadyClaimed = lastClaimDate === todayKey;

  const handleClaim = () => {
    if (alreadyClaimed) {
      return;
    }

    if (claimDaily()) {
      addBalance(dailyReward);
    }
  };

  return (
    <main className="page-shell">
      <div className="page-frame">
        <header className="topbar">
          <div className="brand-wrap">
            <div className="brand-mark">G</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">GoodTap</div>
              <div className="text-[11px] text-slate-600">Daily reward</div>
            </div>
          </div>
          <div className="topbar-balance">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">G$</span>
            <strong>{balance.toFixed(1)}</strong>
          </div>
        </header>

        <section className="stack gap-4 px-4 py-4">
          <GlassCard className="p-5">
            <p className="eyebrow">GoodDollar claim</p>
            <h1 className="headline-xl">Claim today&apos;s reward</h1>
            <div className="mt-4 flex items-center justify-between rounded-3xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              <span>Reward</span>
              <span>{dailyReward.toFixed(1)} G$</span>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-700">
                <Coins className="text-amber-500" size={18} />
                <span>Earn a daily GoodDollar reward for staying active.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-indigo-50 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Streak</div>
                  <div className="mt-2 text-2xl font-extrabold text-indigo-700">{streak}</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Verified</div>
                  <div className="mt-2 text-lg font-extrabold text-emerald-700">{verified ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <button type="button" className="btn btn-primary w-full" disabled={alreadyClaimed} onClick={handleClaim}>
                {alreadyClaimed ? 'Already claimed today' : `Claim ${dailyReward.toFixed(1)} G$`}
              </button>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Sparkles size={16} className="text-indigo-500" />
                {alreadyClaimed ? 'You have already claimed today. Come back tomorrow.' : 'Daily rewards reset every 24 hours.'}
              </div>
            </div>
          </GlassCard>

          <div className="flex gap-3">
            <Link href="/" className="btn flex-1 items-center justify-center bg-white text-slate-700 shadow-none">
              Home
            </Link>
            <Link href="/me" className="btn flex-1 items-center justify-center bg-slate-900 text-white shadow-none">
              My profile
            </Link>
          </div>

          {alreadyClaimed && (
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} />
                Claim captured successfully today.
              </div>
            </GlassCard>
          )}
        </section>
      </div>
    </main>
  );
}
