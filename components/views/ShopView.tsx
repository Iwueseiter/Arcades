'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Gem, Package, Zap } from 'lucide-react';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { isSignedIn } from '@/lib/access';
import { api } from '@/lib/api';
import { playSound } from '@/lib/audioManager';
import { onChainMode, tournamentsEnabled } from '@/lib/chain/config';
import { describeError, useWalletStore } from '@/lib/chain/wallet-store';
import { formatG } from '@/lib/format';
import { usePlayerStore } from '@/lib/player-store';
import { SHOP_ITEMS, type ShopItem } from '@/lib/shop-catalog';
import { toast } from '@/lib/toast-store';
import { useBalance, useOwnedItems } from '@/lib/use-economy';

const ART: Record<ShopItem['accent'], typeof Package> = { gold: Package, mint: Zap, violet: Gem, coral: Crown };

export function ShopView() {
  const balance = useBalance();
  const owned = useOwnedItems();
  const account = useWalletStore((s) => s.account);
  const buyOnChain = useWalletStore((s) => s.buyItem);
  const player = usePlayerStore((s) => s.player);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [pending, setPending] = useState<string | null>(null);
  const signedIn = isSignedIn(player);

  const buy = async (item: ShopItem) => {
    if (!signedIn) {
      toast.error('Sign in to pay', 'Connect a wallet or sign in with email first.');
      return;
    }
    setPending(item.slug);
    try {
      if (onChainMode) {
        const ok = await buyOnChain(item.slug);
        if (!ok) throw new Error('Connect your wallet to pay.');
      } else {
        const { player: next } = await api.demoBuy(item.slug);
        setPlayer(next);
      }
      playSound('shop-purchase', 1);
      toast.success(`${item.name} unlocked`, `${item.price} G$ spent.`);
    } catch (error) {
      toast.error('Couldn’t buy that', describeError(error));
    } finally {
      setPending(null);
    }
  };

  const needsWallet = onChainMode && !account;
  const cannotPay = !signedIn || needsWallet;

  return (
    <>
      <div className="card card-gold">
        <div className="row">
          <div>
            <p className="eyebrow">Shop</p>
            <h1 className="title-xl">Spend G$</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="eyebrow">Balance</p>
            <div className="title-md gold-text num" style={{ fontSize: '1.6rem' }}>
              {balance === null ? '–' : `${formatG(balance)} G$`}
            </div>
          </div>
        </div>
        <p className="copy" style={{ marginTop: 8 }}>
          {onChainMode
            ? `Your items are saved to your wallet. 10% of what you spend goes to GoodDollar’s UBI pool${tournamentsEnabled ? ', and the rest to the tournament prize pot' : ''}.`
            : 'Test mode: you’re spending play money for now.'}
        </p>
        {!signedIn ? (
          <p className="copy" style={{ marginTop: 12 }}>
            Sign in with a wallet or email to buy items. Guests can’t pay.
          </p>
        ) : needsWallet ? (
          <div style={{ marginTop: 14 }}>
            <ConnectButton block />
          </div>
        ) : null}
      </div>

      <div className="shop-grid">
        {SHOP_ITEMS.map((item, index) => {
          const Icon = ART[item.accent];
          const isOwned = owned.includes(item.slug);
          const affordable = balance !== null && balance >= item.price;
          return (
            <motion.div
              key={item.slug}
              className="shop-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={`shop-art ${item.accent}`}>
                <Icon strokeWidth={2.2} />
                {isOwned && (
                  <span className="badge badge-mint owned-ribbon">
                    <Check size={11} /> Owned
                  </span>
                )}
              </div>
              <div>
                <p className="title-md" style={{ fontSize: '1.1rem' }}>
                  {item.name}
                </p>
                <p className="copy" style={{ fontSize: '0.78rem', marginTop: 3 }}>
                  {item.blurb}
                </p>
              </div>
              <button
                type="button"
                className={`btn btn-sm btn-block ${isOwned ? 'btn-ghost' : 'btn-gold'}`}
                style={{ marginTop: 'auto' }}
                disabled={isOwned || cannotPay || !affordable || pending !== null}
                onClick={() => buy(item)}
              >
                {pending === item.slug ? <span className="spinner" /> : isOwned ? 'Owned' : `${item.price} G$`}
              </button>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
