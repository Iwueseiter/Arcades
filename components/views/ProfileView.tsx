'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, LogOut, Music, ShieldCheck, Volume2, Vibrate, Wallet } from 'lucide-react';
import { ConnectButton } from '@/components/wallet/ConnectButton';
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
      toast.error('Couldn’t save', describeError(error));
    } finally {
      setSaving(false);
    }
  };

  const isVip = owned.includes('vip-pass');
  const displayName = player?.displayName ?? 'Guest';
  const dirty = player && (name !== player.name || email !== player.email);

  return (
    <>
      <div className="card card-hero" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar name={displayName} size={64} />
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{isVip ? '👑 VIP player' : account ? 'Wallet connected' : 'Playing as guest'}</p>
          <h1 className="title-xl" style={{ fontSize: '1.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </h1>
          {account && chainState?.verified && onChainMode && (
            <span className="badge badge-mint" style={{ marginTop: 6 }}>
              <ShieldCheck size={12} /> Face check done
            </span>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <p className="eyebrow">Best</p>
          <div className="stat-value num">{player?.bestScore.toLocaleString() ?? '–'}</div>
        </div>
        <div className="stat">
          <p className="eyebrow">Games</p>
          <div className="stat-value num">{player?.gamesPlayed ?? '–'}</div>
        </div>
        <div className="stat">
          <p className="eyebrow">All points</p>
          <div className="stat-value num">{player ? Intl.NumberFormat(undefined, { notation: 'compact' }).format(player.totalScore) : '–'}</div>
        </div>
      </div>

      <div className="card">
        <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Wallet size={12} /> Wallet
        </p>
        {account ? (
          <>
            <div className="row" style={{ marginTop: 8 }}>
              <div>
                <p className="title-md num">{shortAddress(account)}</p>
                <p className="copy" style={{ fontSize: '0.8rem' }}>
                  {chainConfig.chain.name}
                </p>
              </div>
              <a className="icon-btn" href={`${chainConfig.explorerUrl}/address/${account}`} target="_blank" rel="noreferrer" aria-label="View on explorer">
                <ExternalLink size={16} />
              </a>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-block"
              style={{ marginTop: 12 }}
              onClick={() => disconnect().then(() => toast.info('Signed out', 'You’re playing as a guest now.'))}
            >
              <LogOut size={16} /> Sign out
            </button>
          </>
        ) : (
          <>
            <p className="copy" style={{ margin: '6px 0 12px' }}>
              Connect a wallet to claim free daily G$ and keep your items. Your progress comes with you.
            </p>
            <ConnectButton block />
          </>
        )}
      </div>

      <form className="card" onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        <p className="eyebrow">Profile</p>
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
        {onChainMode ? 'Prizes are paid in G$' : 'Test mode · real prizes start soon'}
        <br />
        <Link href="/stats">Stats</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
      </p>
    </>
  );
}
