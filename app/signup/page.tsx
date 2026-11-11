'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useProfileStore } from '@/lib/profile-store';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useProfileStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await signUp(name, email);
    router.push('/me');
  };

  return (
    <main className="page-shell">
      <div className="page-frame">
        <header className="topbar">
          <div className="brand-wrap">
            <div className="brand-mark">G</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">GoodTap</div>
              <div className="text-[11px] text-slate-600">Create account</div>
            </div>
          </div>
          <Link href="/" className="icon-button" aria-label="Back to home">
            <span className="text-lg">←</span>
          </Link>
        </header>

        <section className="stack gap-4 px-4 pb-8 pt-4">
          <GlassCard className="p-5">
            <p className="eyebrow">Welcome</p>
            <h1 className="headline-xl">Join GoodTap</h1>
            <p className="mt-3 text-sm text-slate-600">
              Create your player profile and start collecting daily GoodDollar rewards with every run.
            </p>
          </GlassCard>

          <GlassCard className="p-5">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Display name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-400"
                  placeholder="Player One"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-400"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                <ShieldCheck size={16} />
                Verification unlocks daily claim access and reward tracking.
              </div>

              <button type="submit" className="btn btn-primary w-full">
                Create my profile
              </button>
            </form>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Daily claim + streak tracking enabled
            </div>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
