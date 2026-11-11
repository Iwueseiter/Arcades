import { celo, celoSepolia } from 'viem/chains';
import { getAddress, isAddress, type Address } from 'viem';

const optionalAddress = (value: string | undefined): Address | null =>
  value && isAddress(value) && !/^0x0{40}$/i.test(value) ? getAddress(value) : null;

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? celo.id);

export const chain = chainId === celoSepolia.id ? celoSepolia : celo;

export const chainConfig = {
  chain,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || chain.rpcUrls.default.http[0],
  // G$ on Celo mainnet. Override for testnets.
  tokenAddress: optionalAddress(process.env.NEXT_PUBLIC_GD_TOKEN_ADDRESS) ?? getAddress('0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'),
  tokenDecimals: 18,
  // When no arcade contract is configured the app runs in demo mode: rewards and purchases are tracked off-chain.
  arcadeAddress: optionalAddress(process.env.NEXT_PUBLIC_ARCADE_ADDRESS),
  explorerUrl: chain.blockExplorers?.default.url ?? 'https://celoscan.io',
};

export const onChainMode = chainConfig.arcadeAddress !== null;
