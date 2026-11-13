'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, LogOut, Music, ShieldCheck, Volume2, Vibrate, Wallet } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { chainConfig, onChainMode } from '@/lib/chain/config';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { shortAddress } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';
import { useSettingsStore } from '@/lib/settings-store';
import { toast } from '@/lib/toast-store';
import { useOwnedItems } from '@/lib/use-economy';
import { SHOP_ITEMS } from '@/lib/shop-catalog';

export function ProfileView() {
  const player = usePlayerStore((s) => s.player);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const { account, chainState, disconnect } = useWalletStore();
  const { muted, music, haptics, toggleMuted, toggleMusic, toggleHaptics } = useSettingsStore();
  const owned = useOwnedItems();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!player) return;
    setName(player.name);
    setEmail(player.email);
  }, [player]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      setPlayer(await api.updateMe({ name, email }));
      toast.success('Profile saved');
    } catch (error) {
      toast.error('Couldn\u2019t save', describeError(error));
    } finally {
      setSaving(false);
    }
  };

  const signOut = () =>
    disconnect().then(() => toast.info('Signed out', 'Sign back in anytime.'));

  const isVip = owned.includes('vip-pass');
  const displayName = player?.displayName ?? 'Player';
  const dirty = player && (name !== player.name || email !== player.email);

  // The address shown — prefer the connected wallet account, fall back to player.address
  const walletAddress = account ?? player?.address ?? null;

  return (
    <>
      {/* ── Header ── */}
      <div className="card card-hero" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar name={displayName} size={64} />
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">
            {isVip ? '\uD83D\uDC51 VIP player' : player?.signedInEmail ? 'Signed in with email' : 'Signed in with wallet'}
          </p>
          <h1 className="title-xl" style={{ fontSize: '1.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </h1>
          {chainState?.verified && onChainMode && (
            <span className="badge badge-mint" style={{ marginTop: 6 }}>
              <ShieldCheck size={12} /> Face check done
            </span>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <div className="stat">
          <p className="eyebrow">Best</p>
          <div className="stat-value num">{player?.bestScore.toLocaleString() ?? '\u2013'}</div>
        </div>
        <div className="stat">
          <p className="eyebrow">Games</p>
          <div className="stat-value num">{player?.gamesPlayed ?? '\u2013'}</div>
        </div>
        <div className="stat">
          <p className="eyebrow">All points</p>
          <div className="stat-value num">
            {player ? Intl.NumberFormat(undefined, { notation: 'compact' }).format(player.totalScore) : '\u2013'}
          </div>
        </div>
      </div>

      {/* ── Wallet info (read-only, no connect prompt) ── */}
      {walletAddress && (
        <div className="card">
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Wallet size={12} /> Wallet
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <div>
              <p className="title-md num">{shortAddress(walletAddress)}</p>
              <p className="copy" style={{ fontSize: '0.8rem' }}>{chainConfig.chain.name}</p>
            </div>
            <a
              className="icon-btn"
              href={`${chainConfig.explorerUrl}/address/${walletAddress}`}
              target="_blank"
              rel="noreferrer"
              aria-label="View on explorer"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      )}

      {/* ── Sign out ── */}
      <div className="card">
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={signOut}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>

      {/* ── Profile form ── */}
      <form className="card" onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        <p className="eyebrow">Profile</p>
        <p className="copy" style={{ margin: 0, fontSize: '0.84rem' }}>
          This name shows on the weekly board. You can change it anytime.
        </p>
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" className="input" value={name} maxLength={20} placeholder="Player One" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email (optional)</label>
          <input id="email" type="email" className="input" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={!dirty || saving}>
          {saving ? <span className="spinner" /> : 'Save profile'}
        </button>
      </form>

      {/* ── Owned items ── */}
      {owned.length > 0 && (
        <div className="card">
          <p className="eyebrow">Your items</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {SHOP_ITEMS.filter((item) => owned.includes(item.slug)).map((item) => (
              <span key={item.slug} className="badge badge-gold">
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Settings ── */}
      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <p className="eyebrow">Settings</p>
        <div className="row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
            <Volume2 size={18} color="var(--muted)" /> Sound effects
          </span>
          <button type="button" role="switch" aria-checked={!muted} aria-label="Sound effects" className="toggle" onClick={toggleMuted} />
        </div>
        <div className="row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
            <Music size={18} color="var(--muted)" /> Music
          </span>
          <button type="button" role="switch" aria-checked={music} aria-label="Music" className="toggle" onClick={toggleMusic} />
        </div>
        <div className="row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
            <Vibrate size={18} color="var(--muted)" /> Vibration
          </span>
          <button type="button" role="switch" aria-checked={haptics} aria-label="Vibration" className="toggle" onClick={toggleHaptics} />
        </div>
      </div>

      <p className="copy" style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--faint)' }}>
        {onChainMode ? 'Prizes are paid in G$' : 'Test mode \u00b7 real prizes start soon'}
        <br />
        <Link href="/stats">Stats</Link> \u00b7 <Link href="/terms">Terms</Link> \u00b7 <Link href="/privacy">Privacy</Link>
      </p>
    </>
  );
}
