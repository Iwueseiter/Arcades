export type GoodDollarConfig = {
  appEnv: 'development' | 'production' | 'test';
  chainId: number;
  rpcUrl: string;
  walletAddress: string;
  tokenAddress: string;
  rewardPoolAddress: string;
  shopAddress: string;
  referralAddress: string;
  mockContractsEnabled: boolean;
};

export function getGoodDollarConfig(): GoodDollarConfig {
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV ?? 'development') as GoodDollarConfig['appEnv'];
  const mockContractsEnabled = appEnv === 'production'
    ? process.env.NEXT_PUBLIC_ENABLE_MOCK_CONTRACTS === 'true'
    : process.env.NEXT_PUBLIC_ENABLE_MOCK_CONTRACTS !== 'false';

  return {
    appEnv,
    chainId: Number(process.env.NEXT_PUBLIC_GOODDOLLAR_CHAIN_ID ?? 42220),
    rpcUrl: process.env.NEXT_PUBLIC_GOODDOLLAR_RPC_URL ?? 'https://forno.celo.org',
    walletAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_WALLET_ADDRESS ?? '0xF42C9Ca2b10010142e2bAc34eBdDDB0b82177684',
    tokenAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_TOKEN_ADDRESS ?? '0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a',
    rewardPoolAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_REWARD_POOL_ADDRESS ?? '0xF42C9Ca2b10010142e2bAc34eBdDDB0b82177684',
    shopAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_SHOP_ADDRESS ?? '0xF42C9Ca2b10010142e2bAc34eBdDDB0b82177684',
    referralAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_REFERRAL_ADDRESS ?? '0xF42C9Ca2b10010142e2bAc34eBdDDB0b82177684',
    mockContractsEnabled,
  };
}

export const goodDollarConfig = getGoodDollarConfig();
