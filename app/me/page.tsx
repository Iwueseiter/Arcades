'use client';

import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useProfileStore } from '@/lib/profile-store';

export default function MePage() {
  const profile = useProfileStore();
  const profileName = profile.name || 'Player One';

  return (
    <main className="page-shell">
      <div className="page-frame">
        <header className="topbar">
          <div className="brand-wrap">
            <div className="brand-mark">G</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">GoodTap</div>
              <div className="text-[11px] text-slate-600">My profile</div>
            </div>
          </div>
          <Link href="/" className="icon-button" aria-label="Back to home">
            <span className="text-lg">←</span>
          </Link>
        </header>

        <section className="stack gap-4 px-4 py-4">
          <GlassCard className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Profile</p>
                <h1 className="headline-xl">{profileName}</h1>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <ShieldCheck size={12} />
                {profile.verified ? 'Verified' : 'Pending'}
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">{profile.email || 'player@goodtap.app'}</p>
          </GlassCard>

          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Sparkles size={15} className="text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Streak</span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-indigo-700">{profile.streak}</div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Trophy size={15} className="text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Games</span>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-amber-700">{profile.gamesPlayed}</div>
            </GlassCard>
          </div>

          <GlassCard className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <span>Total score</span>
                <span className="font-bold">{profile.totalScore.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <span>Daily reward</span>
                <span className="font-bold">{profile.dailyReward.toFixed(1)} G$</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                <span>Last claim</span>
                <span className="font-bold">{profile.lastClaimDate ?? 'Never'}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <span>Verification</span>
                <span className="flex items-center gap-1 font-bold">
                  <CheckCircle2 size={14} />
                  {profile.verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
          </GlassCard>

          <div className="flex gap-3">
            <Link href="/signup" className="btn flex-1 items-center justify-center bg-white text-slate-700 shadow-none">
              {profile.name ? 'Update profile' : 'Sign up'}
            </Link>
            <Link href="/claim" className="btn flex-1 items-center justify-center bg-slate-900 text-white shadow-none">
              Claim G$
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
