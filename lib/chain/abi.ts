export const arcadeAbi = [
  { type: 'function', name: 'claimDaily', stateMutability: 'nonpayable', inputs: [], outputs: [{ name: 'amount', type: 'uint256' }] },
  {
    type: 'function',
    name: 'claimRewards',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'cumulativeAmount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: 'amount', type: 'uint256' }],
  },
  { type: 'function', name: 'buyItem', stateMutability: 'nonpayable', inputs: [{ name: 'itemId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'setReferrer', stateMutability: 'nonpayable', inputs: [{ name: 'referrer', type: 'address' }], outputs: [] },
  {
    type: 'function',
    name: 'previewDaily',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'canClaim', type: 'bool' },
      { name: 'amount', type: 'uint256' },
      { name: 'nextStreak', type: 'uint32' },
    ],
  },
  { type: 'function', name: 'currentStreak', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'isVerified', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'poolBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'referralBonus', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'rewardsClaimed', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'players',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      { name: 'lastClaimDay', type: 'uint64' },
      { name: 'streak', type: 'uint32' },
      { name: 'totalClaims', type: 'uint32' },
      { name: 'referrer', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'owns',
    stateMutability: 'view',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'itemId', type: 'bytes32' },
    ],
    outputs: [{ type: 'bool' }],
  },
  { type: 'error', name: 'NotVerified', inputs: [] },
  { type: 'error', name: 'AlreadyClaimedToday', inputs: [] },
  { type: 'error', name: 'InvalidReferrer', inputs: [] },
  { type: 'error', name: 'ReferrerAlreadySet', inputs: [] },
  { type: 'error', name: 'VoucherExpired', inputs: [] },
  { type: 'error', name: 'InvalidSignature', inputs: [] },
  { type: 'error', name: 'NothingToClaim', inputs: [] },
  { type: 'error', name: 'DailyBudgetExceeded', inputs: [] },
  { type: 'error', name: 'InsufficientPool', inputs: [] },
  { type: 'error', name: 'ItemUnavailable', inputs: [] },
  { type: 'error', name: 'AlreadyOwned', inputs: [] },
  { type: 'error', name: 'EnforcedPause', inputs: [] },
] as const;

export const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

// Matches XurriArcade's EIP-712 domain and REWARD_TYPEHASH.
export const rewardVoucherTypes = {
  RewardVoucher: [
    { name: 'player', type: 'address' },
    { name: 'cumulativeAmount', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;
