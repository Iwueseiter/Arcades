import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      balance: 24.5,
      purchases: [],
      syncFromServer: async () => {
        const serverState = await fetchWalletState();
        if (!serverState) return;
        set({
          balance: Number(serverState.balance ?? 0),
          purchases: Array.isArray(serverState.purchases) ? serverState.purchases : [],
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
