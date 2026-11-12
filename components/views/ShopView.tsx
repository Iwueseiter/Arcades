'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Gem, Package, Zap } from 'lucide-react';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { api } from '@/lib/api';
import { playSound } from '@/lib/audioManager';
import { onChainMode } from '@/lib/chain/config';
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
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [pending, setPending] = useState<string | null>(null);

  const buy = async (item: ShopItem) => {
    setPending(item.slug);
    try {
      if (onChainMode) {
        await buyOnChain(item.slug);
      } else {
        const { player } = await api.demoBuy(item.slug);
        setPlayer(player);
      }
      playSound('shop-purchase', 1);
      toast.success(`${item.name} unlocked`, `${item.price} G$ spent${onChainMode ? ' and recycled into the reward pool' : ''}.`);
    } catch (error) {
      toast.error('Purchase failed', describeError(error));
    } finally {
      setPending(null);
    }
  };

  const needsWallet = onChainMode && !account;

  return (
    <>
      <div className="card card-gold">
        <div className="row">
          <div>
            <p className="eyebrow">Arcade shop</p>
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
            ? 'Purchases are on-chain, so your items stay with your wallet. Revenue tops up the reward pool.'
            : 'Demo mode: purchases use your practice balance until the GoodTap contract goes live.'}
        </p>
        {needsWallet && (
          <div style={{ marginTop: 14 }}>
            <ConnectButton block />
          </div>
        )}
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
                disabled={isOwned || needsWallet || !affordable || pending !== null}
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
