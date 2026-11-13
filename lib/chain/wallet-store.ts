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
import { erc20Abi, giftAbi, identityAbi, shopAbi, tournamentsAbi, ubiAbi } from '@/lib/chain/abi';
import { chainConfig } from '@/lib/chain/config';
import { usePlayerStore } from '@/lib/player-store';
import { SHOP_ITEMS, itemIdFor } from '@/lib/shop-catalog';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) });

export type OnChainState = {
  gdBalance: number;
  /** Native CELO, used for network fees. */
  celoBalance: number;
  verified: boolean;
  canClaimDaily: boolean;
  dailyAmount: number;
  nextStreak: number;
  streak: number;
  /** Tournament prizes this wallet has already collected. */
  prizesClaimed: number;
  /** G$ in the tournament prize pot. */
  pot: number;
  owned: string[];
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
  chainState: OnChainState | null;
  ubi: UbiState | null;
  /** True once a UBI read finished (successfully or not), so the UI can tell loading from unavailable. */
  ubiChecked: boolean;
  init: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshChain: () => Promise<void>;
  claimDaily: () => Promise<number | null>;
  claimPrizes: () => Promise<number | null>;
  buyItem: (slug: string) => Promise<boolean>;
  boostPot: (amount: number) => Promise<boolean>;
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
        TicketExpired: 'That took too long. Please try again.',
        InvalidSignature: 'Something went wrong. Please try again.',
        NothingToClaim: 'Nothing new to collect yet.',
        PayoutLimitReached: 'Lots of winners collected today. Try again tomorrow!',
        InsufficientFunds: 'The prize pot is being refilled. Try again soon.',
        ItemUnavailable: 'That item is not for sale right now.',
        AlreadyOwned: 'You already own this item.',
        EnforcedPause: 'Xurri is taking a short break. Try again soon.',
        NoPlaysLeft: 'No tournament games left today. Practice is still on!',
        ZeroAmount: 'Pick an amount first.',
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

let accountsListenerBound = false;

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

const toUnits = (amount: number) => BigInt(Math.round(amount * 1000)) * 10n ** BigInt(chainConfig.tokenDecimals - 3);

/** Approves `spender` to take `amount` G$ when the current allowance is too low. */
async function approveIfNeeded(account: Address, spender: Address, amount: bigint, onBusy: (label: string) => void) {
  const allowance = await publicClient.readContract({
    address: chainConfig.tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account, spender],
  });
  if (allowance >= amount) return;
  onBusy('Allowing Xurri to use your G$');
  await sendTx(account, (wallet) =>
    wallet.writeContract({
      account,
      chain: chainConfig.chain,
      address: chainConfig.tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    }),
  );
}

export const useWalletStore = create<WalletState>()((set, get) => ({
  account: null,
  status: 'idle',
  busy: null,
  hasProvider: false,
  chainState: null,
  ubi: null,
  ubiChecked: false,

  init: async () => {
    const provider = getProvider();
    set({ hasProvider: Boolean(provider) });
    if (!provider) return;

    const player = usePlayerStore.getState().player;
    const accounts = (await provider.request({ method: 'eth_accounts' }).catch(() => [])) as string[];
    const current = accounts[0] ? getAddress(accounts[0]) : null;

    if (current && player?.address && player.address.toLowerCase() === current.toLowerCase()) {
      set({ account: current });
      void get().refreshChain();
    }

    if (!accountsListenerBound) {
      accountsListenerBound = true;
      provider.on?.('accountsChanged', (next: string[]) => {
        const nextAccount = next[0] ? getAddress(next[0]) : null;
        if (nextAccount === get().account) return;
        // Locking the wallet should not wipe the Xurri session; switching wallets does.
        set({ account: null, chainState: null, ubi: null });
        if (nextAccount) void api.logout().then(usePlayerStore.getState().setPlayer);
      });
    }
  },

  connect: async () => {
    const provider = getProvider();
    if (!provider) throw new Error('No wallet found. Open Xurri in a wallet app, or install a wallet in your browser.');
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
    if (!account) return;
    const { giftAddress, tournamentsAddress, shopAddress, tokenAddress } = chainConfig;

    const read = <T,>(promise: Promise<T>) => promise.catch(() => null);
    const [balance, celo, preview, streak, verified, playsLeft, claimed, pot, owns] = await Promise.all([
      read(publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [account] })),
      read(publicClient.getBalance({ address: account })),
      giftAddress ? read(publicClient.readContract({ address: giftAddress, abi: giftAbi, functionName: 'preview', args: [account] })) : null,
      giftAddress ? read(publicClient.readContract({ address: giftAddress, abi: giftAbi, functionName: 'streakOf', args: [account] })) : null,
      giftAddress ? read(publicClient.readContract({ address: giftAddress, abi: giftAbi, functionName: 'isVerified', args: [account] })) : null,
      tournamentsAddress
        ? read(publicClient.readContract({ address: tournamentsAddress, abi: tournamentsAbi, functionName: 'playsLeft', args: [account] }))
        : null,
      tournamentsAddress
        ? read(publicClient.readContract({ address: tournamentsAddress, abi: tournamentsAbi, functionName: 'prizesClaimed', args: [account] }))
        : null,
      tournamentsAddress ? read(publicClient.readContract({ address: tournamentsAddress, abi: tournamentsAbi, functionName: 'potBalance' })) : null,
      shopAddress
        ? read(
            publicClient.multicall({
              allowFailure: true,
              contracts: SHOP_ITEMS.map((item) => ({
                address: shopAddress,
                abi: shopAbi,
                functionName: 'owns' as const,
                args: [account, itemIdFor(item.slug)] as const,
              })),
            }),
          )
        : null,
    ]);

    set({
      chainState: {
        gdBalance: balance === null ? 0 : toG(balance),
        celoBalance: celo === null ? 0 : Number(formatUnits(celo, 18)),
        verified: Boolean(verified),
        canClaimDaily: preview?.[0] ?? false,
        dailyAmount: preview ? toG(preview[1]) : 0,
        nextStreak: preview?.[2] ?? 1,
        streak: streak ?? 0,
        prizesClaimed: claimed === null ? 0 : toG(claimed),
        pot: pot === null ? 0 : toG(pot),
        playsLeft: playsLeft ?? 0,
        owned: SHOP_ITEMS.filter((_, index) => owns?.[index]?.status === 'success' && owns[index].result === true).map(
          (item) => item.slug,
        ),
      },
    });
  },

  claimDaily: async () => {
    const { account, chainState } = get();
    const gift = chainConfig.giftAddress;
    if (!account || !gift) return null;
    if (!chainState?.verified) throw new Error('Do the quick face check in the GoodDollar app first.');
    set({ busy: 'Opening your daily gift' });
    try {
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({ account, address: gift, abi: giftAbi, functionName: 'claim' });
        return wallet.writeContract(request);
      });
      await get().refreshChain();
      return chainState?.dailyAmount ?? 0;
    } finally {
      set({ busy: null });
    }
  },

  claimPrizes: async () => {
    const { account } = get();
    const tournaments = chainConfig.tournamentsAddress;
    if (!account || !tournaments) return null;
    set({ busy: 'Collecting your prizes' });
    try {
      const ticket = await api.voucher();
      const before = get().chainState?.prizesClaimed ?? 0;
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({
          account,
          address: tournaments,
          abi: tournamentsAbi,
          functionName: 'claimPrizes',
          args: [BigInt(ticket.cumulativeAmount), BigInt(ticket.deadline), ticket.signature],
        });
        return wallet.writeContract(request);
      });
      await get().refreshChain();
      return (get().chainState?.prizesClaimed ?? before) - before;
    } finally {
      set({ busy: null });
    }
  },

  buyItem: async (slug) => {
    const { account } = get();
    const shop = chainConfig.shopAddress;
    const item = SHOP_ITEMS.find((entry) => entry.slug === slug);
    if (!account || !shop || !item) return false;
    try {
      await approveIfNeeded(account, shop, toUnits(item.price), (busy) => set({ busy }));
      set({ busy: `Buying ${item.name}` });
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({
          account,
          address: shop,
          abi: shopAbi,
          functionName: 'buy',
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

  boostPot: async (amount) => {
    const { account } = get();
    const tournaments = chainConfig.tournamentsAddress;
    if (!account || !tournaments) return false;
    const value = toUnits(amount);
    try {
      await approveIfNeeded(account, tournaments, value, (busy) => set({ busy }));
      set({ busy: `Adding ${amount} G$ to the pot` });
      await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({
          account,
          address: tournaments,
          abi: tournamentsAbi,
          functionName: 'boost',
          args: [value],
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
    if (!ubi?.verified) throw new Error('Do the quick face check in the GoodDollar app first.');
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

  // Starts a tournament game on-chain. The player only pays the network fee.
  startGameTx: async () => {
    const { account } = get();
    const tournaments = chainConfig.tournamentsAddress;
    if (!account || !tournaments) throw new Error('Connect your wallet to join the tournament');
    set({ busy: 'Starting your tournament game' });
    try {
      const receipt = await sendTx(account, async (wallet) => {
        const { request } = await publicClient.simulateContract({ account, address: tournaments, abi: tournamentsAbi, functionName: 'startGame' });
        return wallet.writeContract(request);
      });
      void get().refreshChain();
      return receipt.transactionHash;
    } finally {
      set({ busy: null });
    }
  },
}));
