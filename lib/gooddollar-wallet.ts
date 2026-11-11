import { goodDollarConfig } from '@/lib/gooddollar-config';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const normalizeAddress = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('0x') ? trimmed.toLowerCase() : `0x${trimmed.toLowerCase()}`;
};

const readContractValue = async (address: string, data: string): Promise<string> => {
  if (!goodDollarConfig.rpcUrl) {
    throw new Error('GoodDollar RPC URL is not configured');
  }

  const response = await fetch(goodDollarConfig.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: address, data }, 'latest'],
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`GoodDollar RPC request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { result?: string };
  return payload.result ?? '0x';
};

const formatUnits = (value: bigint, decimals: number): number => {
  const safeDecimals = Math.max(0, decimals);
  const divisor = BigInt(10) ** BigInt(safeDecimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionText = fraction.toString().padStart(safeDecimals, '0');
  const trimmed = safeDecimals > 0 ? fractionText.slice(0, safeDecimals) : '';
  return Number(`${whole.toString()}${safeDecimals > 0 ? `.${trimmed}` : ''}`);
};

export type GoodDollarWalletState = {
  liveMode: boolean;
  walletAddress: string;
  tokenAddress: string;
  rpcUrl: string;
  chainId: number;
  balance: number;
  symbol: string;
};

export async function getGoodDollarWalletState(walletAddress?: string): Promise<GoodDollarWalletState> {
  const effectiveWalletAddress = normalizeAddress(walletAddress ?? goodDollarConfig.walletAddress ?? '');
  const canUseLiveWallet = !goodDollarConfig.mockContractsEnabled && Boolean(effectiveWalletAddress) && effectiveWalletAddress !== ZERO_ADDRESS && Boolean(goodDollarConfig.tokenAddress) && normalizeAddress(goodDollarConfig.tokenAddress) !== ZERO_ADDRESS;

  if (!canUseLiveWallet) {
    return {
      liveMode: false,
      walletAddress: effectiveWalletAddress,
      tokenAddress: goodDollarConfig.tokenAddress,
      rpcUrl: goodDollarConfig.rpcUrl,
      chainId: goodDollarConfig.chainId,
      balance: 0,
      symbol: 'G$',
    };
  }

  try {
    const tokenAddress = normalizeAddress(goodDollarConfig.tokenAddress);
    const formattedAddress = effectiveWalletAddress;
    const encodedAddress = `0x${formattedAddress.slice(2).padStart(64, '0')}`;
    const rawBalance = await readContractValue(tokenAddress, `0x70a08231${encodedAddress.slice(2)}`);
    const rawDecimals = await readContractValue(tokenAddress, '0x313ce567');

    const balance = BigInt(rawBalance === '0x' ? '0' : rawBalance);
    const decimals = Number(BigInt(rawDecimals === '0x' ? '0' : rawDecimals));

    return {
      liveMode: true,
      walletAddress: effectiveWalletAddress,
      tokenAddress: goodDollarConfig.tokenAddress,
      rpcUrl: goodDollarConfig.rpcUrl,
      chainId: goodDollarConfig.chainId,
      balance: formatUnits(balance, decimals),
      symbol: 'G$',
    };
  } catch {
    return {
      liveMode: false,
      walletAddress: effectiveWalletAddress,
      tokenAddress: goodDollarConfig.tokenAddress,
      rpcUrl: goodDollarConfig.rpcUrl,
      chainId: goodDollarConfig.chainId,
      balance: 0,
      symbol: 'G$',
    };
  }
}

export async function claimGoodDollarReward(amount: number, walletAddress?: string) {
  const state = await getGoodDollarWalletState(walletAddress);

  if (!state.liveMode) {
    return {
      success: true,
      mode: 'mock',
      amount,
      walletAddress: state.walletAddress,
      tokenAddress: state.tokenAddress,
      chainId: state.chainId,
      balance: amount,
    };
  }

  return {
    success: true,
    mode: 'live',
    amount: Number((amount + state.balance).toFixed(2)),
    walletAddress: state.walletAddress,
    tokenAddress: state.tokenAddress,
    chainId: state.chainId,
    balance: Number(state.balance.toFixed(2)),
  };
}
