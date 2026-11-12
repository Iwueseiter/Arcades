import { create } from 'zustand';
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  getAddress,
  http,
  numberToHex,
  type Address,
  type EIP1193Provider,
  type Hash,
} from 'viem';
import { api } from '@/lib/api';
import { arcadeAbi, erc20Abi, identityAbi, ubiAbi } from '@/lib/chain/abi';
import { chainConfig } from '@/lib/chain/config';
import { usePlayerStore } from '@/lib/player-store';
import { SHOP_ITEMS, itemIdFor } from '@/lib/shop-catalog';

declare global {
  interface Window {
    ethereum?: EIP1193Provider & { isMiniPay?: boolean };
  }
}

export const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) });

export type OnChainState = {
  gdBalance: number;
  verified: boolean;
  canClaimDaily: boolean;
  dailyAmount: number;
  nextStreak: number;
  streak: number;
  totalClaims: number;
  referrer: Address | null;
  rewardsClaimed: number;
  pool: number;
  referralBonus: number;
  owned: string[];
  playFee: bigint;
  playsLeft: number;
};

/** The player's GoodDollar daily claim (UBI), straight from GoodDollar's own contracts. */
export type UbiState = {
  amount: number;
  verified: boolean;
  claimedToday: boolean;
  nextClaimAt: number;
};

type WalletState = {
  account: Address | null;
  status: 'idle' | 'connecting' | 'signing';
  busy: string | null; // label of the pending transaction
  hasProvider: boolean;
  isMiniPay: boolean;
  chainState: OnChainState | null;
  ubi: UbiState | null;
  /** True once a UBI read finished (successfully or not), so the UI can tell loading from unavailable. */
  ubiChecked: boolean;
  init: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshChain: () => Promise<void>;
  claimDaily: () => Promise<number | null>;
  claimRewards: () => Promise<number | null>;
  buyItem: (slug: string) => Promise<boolean>;
  setReferrer: (referrer: Address) => Promise<boolean>;
  refreshUbi: () => Promise<void>;
  claimUbi: () => Promise<number | null>;
  startGameTx: () => Promise<Hash>;
};

const toG = (value: bigint) => Number(formatUnits(value, chainConfig.tokenDecimals));

/** Turns wallet / contract errors into something a player can act on. */
export function describeError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return 'You cancelled the request in your wallet.';
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const messages: Record<string, string> = {
        NotVerified: 'Do the quick face check in the GoodDollar app first.',
        AlreadyClaimedToday: 'You already opened today’s gift. Come back tomorrow!',
        InvalidReferrer: 'That invite link doesn’t work.',
        ReferrerAlreadySet: 'You already accepted an invite.',
        VoucherExpired: 'That took too long. Please try again.',
        InvalidSignature: 'Something went wrong. Please try again.',
        NothingToClaim: 'Nothing new to collect yet.',
        DailyBudgetExceeded: 'All of today’s prizes are gone. Try again tomorrow!',
        InsufficientPool: 'The prize pot is being refilled. Try again soon.',
        ItemUnavailable: 'That item is not for sale right now.',
        AlreadyOwned: 'You already own this item.',
        EnforcedPause: 'Xurri is taking a short break. Try again soon.',
        WrongPlayFee: 'The game price changed. Please try again.',
        NoPlaysLeft: 'No prize games left today. Free play is still on!',
      };
      const name = revert.data?.errorName;
      if (name && messages[name]) return messages[name];
    }
    if (/insufficient funds/i.test(error.message)) return 'Your wallet needs a little CELO to pay the network fee.';
    return error.shortMessage;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function getProvider() {
  return typeof window !== 'undefined' ? window.ethereum ?? null : null;
}

async function ensureChain(provider: EIP1193Provider) {
  const target = chainConfig.chain;
  const current = await provider.request({ method: 'eth_chainId' });
  if (Number(current) === target.id) return;
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: numberToHex(target.id) }] });
  } catch {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: numberToHex(target.id),
          chainName: target.name,
          nativeCurrency: target.nativeCurrency,
          rpcUrls: [chainConfig.rpcUrl],
          blockExplorerUrls: [chainConfig.explorerUrl],
        },
      ],
    });
  }
}

async function sendTx(account: Address, request: (wallet: ReturnType<typeof createWalletClient>) => Promise<Hash>) {
  const provider = getProvider();
  if (!provider) throw new Error('No wallet found');
  await ensureChain(provider);
  const wallet = createWalletClient({ account, chain: chainConfig.chain, transport: custom(provider) });
  const hash = await request(wallet);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error('That didn’t go through. Please try again.');
  return receipt;
}

export const useWalletStore = create<WalletState>()((set, get) => ({
  account: null,
  status: 'idle',
  busy: null,
  hasProvider: false,
  isMiniPay: false,
  chainState: null,
  ubi: null,
  ubiChecked: false,

  init: async () => {
    const provider = getProvider();
    set({ hasProvider: Boolean(provider), isMiniPay: Boolean(provider?.isMiniPay) });
    if (!provider) return;

    const player = usePlayerStore.getState().player;
    const accounts = (await provider.request({ method: 'eth_accounts' }).catch(() => [])) as string[];
    const current = accounts[0] ? getAddress(accounts[0]) : null;

    if (current && player?.address && player.address === current.toLowerCase()) {
      set({ account: current });
      void get().refreshChain();
    } else if (provider.isMiniPay && !player?.address) {
      // MiniPay users expect to be signed in without hunting for a button.
      void get().connect();
    }

    provider.on?.('accountsChanged', (next: string[]) => {
      const nextAccount = next[0] ? getAddress(next[0]) : null;
      if (nextAccount !== get().account) {
        set({ account: null, chainState: null });
        void api.logout().then(usePlayerStore.getState().setPlayer);
      }
    });
  },

  connect: async () => {
    const provider = getProvider();
    if (!provider) throw new Error('No wallet found. Open Xurri inside MiniPay or another wallet app.');
    set({ status: 'connecting' });
    try {
      const [raw] = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const account = getAddress(raw);
      await ensureChain(provider).catch(() => undefined);

      set({ status: 'signing' });
      const { message } = await api.nonce(account);
      const wallet = createWalletClient({ account, chain: chainConfig.chain, transport: custom(provider) });
      const signature = await wallet.signMessage({ account, message });
      const player = await api.verify(account, signature);

      usePlayerStore.getState().setPlayer(player);
      set({ account });
      await get().refreshChain();
    } finally {
      set({ status: 'idle' });
    }
  },

  disconnect: async () => {
    const player = await api.logout();
    usePlayerStore.getState().setPlayer(player);
    set({ account: null, chainState: null });
  },

  refreshChain: async () => {
    void get().refreshUbi();
    const { account } = get();
    const arcade = chainConfig.arcadeAddress;
    if (!account) return;

    const balance = await publicClient
      .readContract({ address: chainConfig.tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [account] })
      .catch(() => null);

    if (!arcade) {
      set({ chainState: balance === null ? null : { ...emptyChainState, gdBalance: toG(balance) } });
      return;
    }

    const base = { address: arcade, abi: arcadeAbi } as const;
    const [results, owns] = await Promise.all([
      publicClient.multicall({
        allowFailure: true,
        contracts: [
          { ...base, functionName: 'isVerified', args: [account] },
          { ...base, functionName: 'previewDaily', args: [account] },
          { ...base, functionName: 'currentStreak', args: [account] },
          { ...base, functionName: 'players', args: [account] },
          { ...base, functionName: 'rewardsClaimed', args: [account] },
          { ...base, functionName: 'poolBalance' },
          { ...base, functionName: 'referralBonus' },
          { ...base, functionName: 'playFee' },
          { ...base, functionName: 'playsLeft', args: [account] },
        ],
      }),
      publicClient.multicall({
        allowFailure: true,
        contracts: SHOP_ITEMS.map((item) => ({ ...base, functionName: 'owns' as const, args: [account, itemIdFor(item.slug)] as const })),
      }),
    ]);

    const [verified, preview, streak, playerInfo, claimed, pool, referralBonus, playFee, playsLeft] = results;
    const previewValue = preview.status === 'success' ? preview.result : null;
    const info = playerInfo.status === 'success' ? playerInfo.result : null;

    set({
      chainState: {
        gdBalance: balance === null ? 0 : toG(balance),
        verified: verified.status === 'success' ? Boolean(verified.result) : false,
        canClaimDaily: previewValue?.[0] ?? false,
        dailyAmount: previewValue ? toG(previewValue[1]) : 0,
        nextStreak: previewValue?.[2] ?? 1,
        streak: streak.status === 'success' ? Number(streak.result) : 0,
        totalClaims: info ? Number(info[2]) : 0,
        referrer: info && !/^0x0{40}$/i.test(info[3]) ? info[3] : null,
        rewardsClaimed: claimed.status === 'success' ? toG(claimed.result) : 0,
        pool: pool.status === 'success' ? toG(pool.result) : 0,
        referralBonus: referralBonus.status === 'success' ? toG(referralBonus.result) : 0,
        playFee: playFee.status === 'success' ? (playFee.result as bigint) : 0n,
        playsLeft: playsLeft.status === 'success' ? Number(playsLeft.result) : 0,
        owned: SHOP_ITEMS.filter((_, index) => owns[index]?.status === 'success' && owns[index].result === true).map(
          (item) => item.slug,
        ),
      },
    });
  },

  claimDaily: async () => {
    const { account, chainState } = get();
    const arcade = chainConfig.arcadeAddress;
    if (!account || !arcade) return null;
    set({ busy: 'Opening your daily gift' });
    try {
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({ account, address: arcade, abi: arcadeAbi, functionName: 'claimDaily' });
        return wallet.writeContract(request);
      });
      await get().refreshChain();
      return chainState?.dailyAmount ?? 0;
    } finally {
      set({ busy: null });
    }
  },

  claimRewards: async () => {
    const { account } = get();
    const arcade = chainConfig.arcadeAddress;
    if (!account || !arcade) return null;
    set({ busy: 'Collecting your prizes' });
    try {
      const voucher = await api.voucher();
      const before = get().chainState?.rewardsClaimed ?? 0;
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({
          account,
          address: arcade,
          abi: arcadeAbi,
          functionName: 'claimRewards',
          args: [BigInt(voucher.cumulativeAmount), BigInt(voucher.deadline), voucher.signature],
        });
        return wallet.writeContract(request);
      });
      await get().refreshChain();
      return (get().chainState?.rewardsClaimed ?? before) - before;
    } finally {
      set({ busy: null });
    }
  },

  buyItem: async (slug) => {
    const { account } = get();
    const arcade = chainConfig.arcadeAddress;
    const item = SHOP_ITEMS.find((entry) => entry.slug === slug);
    if (!account || !arcade || !item) return false;
    const price = BigInt(item.price) * 10n ** BigInt(chainConfig.tokenDecimals);

    try {
      const allowance = await publicClient.readContract({
        address: chainConfig.tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [account, arcade],
      });
      if (allowance < price) {
        set({ busy: 'Getting ready to buy' });
        await sendTx(account, (wallet) =>
          wallet.writeContract({
            account,
            chain: chainConfig.chain,
            address: chainConfig.tokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [arcade, price],
          }),
        );
      }
      set({ busy: `Buying ${item.name}` });
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({
          account,
          address: arcade,
          abi: arcadeAbi,
          functionName: 'buyItem',
          args: [itemIdFor(slug)],
        });
        return wallet.writeContract(request);
      });
      await get().refreshChain();
      return true;
    } finally {
      set({ busy: null });
    }
  },

  setReferrer: async (referrer) => {
    const { account } = get();
    const arcade = chainConfig.arcadeAddress;
    if (!account || !arcade) return false;
    set({ busy: 'Accepting invite' });
    try {
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({
          account,
          address: arcade,
          abi: arcadeAbi,
          functionName: 'setReferrer',
          args: [referrer],
        });
        return wallet.writeContract(request);
      });
      await get().refreshChain();
      return true;
    } finally {
      set({ busy: null });
    }
  },

  refreshUbi: async () => {
    const { account } = get();
    const { ubiAddress, identityAddress } = chainConfig;
    if (!account || !ubiAddress || !identityAddress) return set({ ubi: null, ubiChecked: true });
    try {
      const [amount, root, day, periodStart] = await Promise.all([
        publicClient.readContract({ address: ubiAddress, abi: ubiAbi, functionName: 'checkEntitlement', args: [account] }),
        publicClient.readContract({ address: identityAddress, abi: identityAbi, functionName: 'getWhitelistedRoot', args: [account] }),
        publicClient.readContract({ address: ubiAddress, abi: ubiAbi, functionName: 'currentDay' }),
        publicClient.readContract({ address: ubiAddress, abi: ubiAbi, functionName: 'periodStart' }),
      ]);
      set({
        ubi: {
          amount: toG(amount),
          verified: !/^0x0{40}$/i.test(root),
          // checkEntitlement returns 0 once today's claim has been taken
          claimedToday: amount === 0n,
          nextClaimAt: (Number(periodStart) + (Number(day) + 1) * 86400) * 1000,
        },
        ubiChecked: true,
      });
    } catch {
      set({ ubi: null, ubiChecked: true });
    }
  },

  claimUbi: async () => {
    const { account, ubi } = get();
    const ubiAddress = chainConfig.ubiAddress;
    if (!account || !ubiAddress) return null;
    set({ busy: 'Claiming your free G$' });
    try {
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({ account, address: ubiAddress, abi: ubiAbi, functionName: 'claim' });
        return wallet.writeContract(request);
      });
      await get().refreshChain();
      return ubi?.amount ?? 0;
    } finally {
      set({ busy: null });
    }
  },

  // Starts a prize game on-chain. The player pays the network fee (and the play fee, if one is set).
  startGameTx: async () => {
    const { account } = get();
    const arcade = chainConfig.arcadeAddress;
    if (!account || !arcade) throw new Error('Connect your wallet to play for prizes');
    set({ busy: 'Starting your prize game' });
    try {
      const fee = await publicClient.readContract({ address: arcade, abi: arcadeAbi, functionName: 'playFee' });
      const receipt = await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({ account, address: arcade, abi: arcadeAbi, functionName: 'startGame', value: fee });
        return wallet.writeContract(request);
      });
      void get().refreshChain();
      return receipt.transactionHash;
    } finally {
      set({ busy: null });
    }
  },
}));

const emptyChainState: OnChainState = {
  playFee: 0n,
  playsLeft: 0,
  gdBalance: 0,
  verified: false,
  canClaimDaily: false,
  dailyAmount: 0,
  nextStreak: 1,
  streak: 0,
  totalClaims: 0,
  referrer: null,
  rewardsClaimed: 0,
  pool: 0,
  referralBonus: 0,
  owned: [],
};
