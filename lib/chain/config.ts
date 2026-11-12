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
  // Xurri's three contracts (see contracts/). Without the tournaments address the app runs in demo
  // mode: gifts, prizes and purchases are tracked off-chain with play money.
  giftAddress: optionalAddress(process.env.NEXT_PUBLIC_GIFT_ADDRESS),
  tournamentsAddress: optionalAddress(process.env.NEXT_PUBLIC_TOURNAMENTS_ADDRESS),
  shopAddress: optionalAddress(process.env.NEXT_PUBLIC_SHOP_ADDRESS),
  explorerUrl: chain.blockExplorers?.default.url ?? 'https://celoscan.io',
  // GoodDollar's daily UBI claim and face-check registry only exist on Celo mainnet.
  ubiAddress:
    optionalAddress(process.env.NEXT_PUBLIC_GD_UBI_ADDRESS) ??
    (chain.id === celo.id ? getAddress('0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1') : null),
  identityAddress:
    optionalAddress(process.env.NEXT_PUBLIC_GD_IDENTITY_ADDRESS) ??
    (chain.id === celo.id ? getAddress('0xC361A6E67822a0EDc17D899227dd9FC50BD62F42') : null),
};

export const onChainMode = chainConfig.tournamentsAddress !== null;
