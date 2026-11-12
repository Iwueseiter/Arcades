import { parseAbi } from 'viem';

/** Errors shared by all Xurri contracts (XurriBase), plus OpenZeppelin's pause error. */
const commonErrors = [
  'error NotVerified()',
  'error ZeroAddress()',
  'error InsufficientFunds()',
  'error EnforcedPause()',
] as const;

/** XurriDailyGift: one G$ gift per verified person per day, growing with a streak. */
export const giftAbi = parseAbi([
  'function claim() returns (uint256 amount)',
  'function preview(address account) view returns (bool canClaim, uint256 amount, uint32 nextStreak)',
  'function streakOf(address account) view returns (uint32)',
  'function isVerified(address account) view returns (bool)',
  'function totalClaims() view returns (uint256)',
  'function totalPaid() view returns (uint256)',
  'function paused() view returns (bool)',
  'event GiftClaimed(address indexed player, address indexed human, uint256 amount, uint32 streak, uint64 day)',
  'error AlreadyClaimedToday()',
  ...commonErrors,
]);

/** XurriTournaments: tournament game starts, the community prize pot and prize payouts. */
export const tournamentsAbi = parseAbi([
  'function startGame() returns (uint32 playNumber)',
  'function playsLeft(address account) view returns (uint32)',
  'function boost(uint256 amount) returns (uint256 toPot)',
  'function boosted(uint64 week) view returns (uint256)',
  'function currentWeek() view returns (uint64)',
  'function potBalance() view returns (uint256)',
  'function claimPrizes(uint256 cumulativeAmount, uint256 deadline, bytes signature) returns (uint256 amount)',
  'function prizesClaimed(address player) view returns (uint256)',
  'function signer() view returns (address)',
  'function paused() view returns (bool)',
  'function ubiShareBps() view returns (uint16)',
  'function totalGames() view returns (uint256)',
  'function totalBoosted() view returns (uint256)',
  'function totalPrizesPaid() view returns (uint256)',
  'function totalToUbi() view returns (uint256)',
  'event GameStarted(address indexed player, address indexed human, uint64 indexed week, uint64 day, uint32 playNumber)',
  'event PotBoosted(address indexed from, uint64 indexed week, uint256 amount, uint256 toPot, uint256 toUbi)',
  'error NoPlaysLeft()',
  'error TicketExpired()',
  'error InvalidSignature()',
  'error NothingToClaim()',
  'error PayoutLimitReached()',
  'error ZeroAmount()',
  ...commonErrors,
]);

/** XurriShop: cosmetic items. Each purchase funds the prize pot and GoodDollar's UBI pool. */
export const shopAbi = parseAbi([
  'function buy(bytes32 itemId)',
  'function owns(address player, bytes32 itemId) view returns (bool)',
  'function paused() view returns (bool)',
  'function totalSales() view returns (uint256)',
  'function totalSpent() view returns (uint256)',
  'function totalToUbi() view returns (uint256)',
  'error ItemUnavailable()',
  'error AlreadyOwned()',
  ...commonErrors,
]);

export const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

// Matches XurriTournaments' EIP-712 domain ("XurriTournaments", "1") and PRIZE_TYPEHASH.
export const prizeTicketTypes = {
  PrizeTicket: [
    { name: 'player', type: 'address' },
    { name: 'cumulativeAmount', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

/** GoodDollar's UBIScheme: verified humans claim their free daily G$ from it. */
export const ubiAbi = parseAbi([
  'function claim() returns (bool)',
  'function checkEntitlement(address member) view returns (uint256)',
  'function currentDay() view returns (uint256)',
  'function periodStart() view returns (uint256)',
]);

/** GoodDollar's Identity: who has passed the face check (a connected wallet resolves to its verified root). */
export const identityAbi = parseAbi(['function getWhitelistedRoot(address account) view returns (address)']);
