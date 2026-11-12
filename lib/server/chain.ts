import { createPublicClient, formatUnits, http } from 'viem';
import { giftAbi, shopAbi, tournamentsAbi } from '@/lib/chain/abi';
import { chainConfig } from '@/lib/chain/config';

export const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) });

export const toG = (value: bigint) => Number(formatUnits(value, chainConfig.tokenDecimals));

/** G$ boosted into a week's tournament pot on-chain (after the UBI share). */
export async function boostedOnChain(weekIndex: number) {
  if (!chainConfig.tournamentsAddress) return 0;
  const value = await publicClient.readContract({
    address: chainConfig.tournamentsAddress,
    abi: tournamentsAbi,
    functionName: 'boosted',
    args: [BigInt(weekIndex)],
  });
  return toG(value);
}

/** Lifetime counters from the three contracts, for the public stats page. Missing contracts read as null. */
export async function contractTotals() {
  const { giftAddress, tournamentsAddress, shopAddress } = chainConfig;
  const read = async <T,>(enabled: unknown, run: () => Promise<T>) => (enabled ? run().catch(() => null) : null);
  const g = (value: bigint | null) => (value === null ? null : toG(value));
  const n = (value: bigint | null) => (value === null ? null : Number(value));

  const [giftClaims, giftPaid, games, boosted, prizesPaid, potBalance, tournamentUbi, shopSales, shopSpent, shopUbi] = await Promise.all([
    read(giftAddress, () => publicClient.readContract({ address: giftAddress!, abi: giftAbi, functionName: 'totalClaims' })),
    read(giftAddress, () => publicClient.readContract({ address: giftAddress!, abi: giftAbi, functionName: 'totalPaid' })),
    read(tournamentsAddress, () => publicClient.readContract({ address: tournamentsAddress!, abi: tournamentsAbi, functionName: 'totalGames' })),
    read(tournamentsAddress, () => publicClient.readContract({ address: tournamentsAddress!, abi: tournamentsAbi, functionName: 'totalBoosted' })),
    read(tournamentsAddress, () =>
      publicClient.readContract({ address: tournamentsAddress!, abi: tournamentsAbi, functionName: 'totalPrizesPaid' }),
    ),
    read(tournamentsAddress, () => publicClient.readContract({ address: tournamentsAddress!, abi: tournamentsAbi, functionName: 'potBalance' })),
    read(tournamentsAddress, () => publicClient.readContract({ address: tournamentsAddress!, abi: tournamentsAbi, functionName: 'totalToUbi' })),
    read(shopAddress, () => publicClient.readContract({ address: shopAddress!, abi: shopAbi, functionName: 'totalSales' })),
    read(shopAddress, () => publicClient.readContract({ address: shopAddress!, abi: shopAbi, functionName: 'totalSpent' })),
    read(shopAddress, () => publicClient.readContract({ address: shopAddress!, abi: shopAbi, functionName: 'totalToUbi' })),
  ]);

  const ubiParts = [g(tournamentUbi), g(shopUbi)].filter((value): value is number => value !== null);
  return {
    giftClaims: n(giftClaims),
    giftPaid: g(giftPaid),
    tournamentGames: n(games),
    potBoosted: g(boosted),
    prizesPaid: g(prizesPaid),
    potBalance: g(potBalance),
    shopSales: n(shopSales),
    shopSpent: g(shopSpent),
    toUbi: ubiParts.length ? ubiParts.reduce((sum, value) => sum + value, 0) : null,
  };
}
