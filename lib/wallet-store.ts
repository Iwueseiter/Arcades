import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { goodDollarConfig } from '@/lib/gooddollar-config';
import { getGoodDollarWalletState } from '@/lib/gooddollar-wallet';

const parsePurchases = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
    } catch {
      return [];
    }
  }

  return [];
};

export type WalletState = {
  balance: number;
  purchases: string[];
  syncFromServer: () => Promise<void>;
  addBalance: (amount: number) => void;
  spendBalance: (amount: number) => boolean;
  buyItem: (itemId: string, amount: number) => boolean;
};

const fetchWalletState = async () => {
  const response = await fetch('/api/wallet', { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as { balance: number; purchases: string[] };
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: goodDollarConfig.mockContractsEnabled ? 24.5 : 0,
      purchases: [],
      syncFromServer: async () => {
        const liveWallet = await getGoodDollarWalletState();
        const serverState = await fetchWalletState();

        if (!serverState && !liveWallet.liveMode) return;

        const nextBalance = liveWallet.liveMode ? liveWallet.balance : Number(serverState?.balance ?? 0);
        set({
          balance: nextBalance,
          purchases: parsePurchases(serverState?.purchases ?? []),
        });
      },
      addBalance: (amount: number) => {
        const nextBalance = Number((get().balance + amount).toFixed(2));
        set({ balance: nextBalance });
        fetch('/api/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', amount }),
        }).catch(() => undefined);
      },
      spendBalance: (amount: number) => {
        const current = get().balance;
        if (current < amount) return false;
        const nextBalance = Number((current - amount).toFixed(2));
        set({ balance: nextBalance });
        fetch('/api/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'spend', amount }),
        }).catch(() => undefined);
        return true;
      },
      buyItem: (itemId: string, amount: number) => {
        const current = get().balance;
        if (current < amount) return false;

        const nextPurchases = get().purchases.includes(itemId) ? get().purchases : [...get().purchases, itemId];
        set({
          balance: Number((current - amount).toFixed(2)),
          purchases: nextPurchases,
        });

        fetch('/api/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'buy', itemId, amount }),
        }).catch(() => undefined);

        return true;
      },
    }),
    { name: 'goodtap-wallet' },
  ),
);
