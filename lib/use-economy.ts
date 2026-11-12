import { onChainMode } from '@/lib/chain/config';
import { useWalletStore } from '@/lib/chain/wallet-store';
import { usePlayerStore } from '@/lib/player-store';

/** The G$ balance to show: the real wallet balance on-chain, or the demo balance otherwise. null = not connected. */
export function useBalance(): number | null {
  const demoBalance = usePlayerStore((s) => s.player?.demo.balance ?? null);
  const account = useWalletStore((s) => s.account);
  const gdBalance = useWalletStore((s) => s.chainState?.gdBalance ?? null);
  if (!onChainMode) return demoBalance;
  return account ? gdBalance : null;
}

export function useOwnedItems(): string[] {
  const demoOwned = usePlayerStore((s) => s.player?.demo.purchases);
  const chainOwned = useWalletStore((s) => s.chainState?.owned);
  return (onChainMode ? chainOwned : demoOwned) ?? [];
}

/** Tournament prizes won but not yet collected on-chain (won server-side minus collected). */
export function usePendingPrizes(): number {
  const earned = usePlayerStore((s) => s.player?.earned ?? 0);
  const claimed = useWalletStore((s) => s.chainState?.prizesClaimed ?? 0);
  return Math.max(0, Number((earned - claimed).toFixed(3)));
}

export function useHasClaimableReward(): boolean {
  const demoClaimed = usePlayerStore((s) => s.player?.demo.claimedToday ?? true);
  const canClaimDaily = useWalletStore((s) => s.chainState?.canClaimDaily ?? false);
  const pending = usePendingPrizes();
  if (!onChainMode) return !demoClaimed;
  return canClaimDaily || pending > 0;
}
