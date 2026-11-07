export type GoodDollarConfig = {
  appEnv: 'development' | 'production' | 'test';
  chainId: number;
  rpcUrl: string;
  tokenAddress: string;
  rewardPoolAddress: string;
  shopAddress: string;
  referralAddress: string;
  mockContractsEnabled: boolean;
};

export function getGoodDollarConfig(): GoodDollarConfig {
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV ?? 'development') as GoodDollarConfig['appEnv'];

  return {
    appEnv,
    chainId: Number(process.env.NEXT_PUBLIC_GOODDOLLAR_CHAIN_ID ?? 42220),
    rpcUrl: process.env.NEXT_PUBLIC_GOODDOLLAR_RPC_URL ?? 'https://forno.celo.org',
    tokenAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_TOKEN_ADDRESS ?? '0x0000000000000000000000000000000000000000',
    rewardPoolAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_REWARD_POOL_ADDRESS ?? '0x0000000000000000000000000000000000000000',
    shopAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_SHOP_ADDRESS ?? '0x0000000000000000000000000000000000000000',
    referralAddress: process.env.NEXT_PUBLIC_GOODDOLLAR_REFERRAL_ADDRESS ?? '0x0000000000000000000000000000000000000000',
    mockContractsEnabled: process.env.NEXT_PUBLIC_ENABLE_MOCK_CONTRACTS !== 'false',
  };
}

export const goodDollarConfig = getGoodDollarConfig();
