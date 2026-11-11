import { privateKeyToAccount } from 'viem/accounts';
import { getAddress, parseUnits, type Hex } from 'viem';
import { chainConfig } from '@/lib/chain/config';
import { rewardVoucherTypes } from '@/lib/chain/abi';

const VOUCHER_TTL_SECONDS = 60 * 30;

const envNumber = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

/** G$ (in thousandths) a ranked round pays for a given score. */
export function roundRewardMilli(score: number) {
  const per100 = envNumber('GOODTAP_REWARD_PER_100_POINTS', 0.05);
  const cap = envNumber('GOODTAP_MAX_REWARD_PER_ROUND', 1);
  return Math.round(Math.min(Math.floor(score / 100) * per100, cap) * 1000);
}

function getSigner() {
  const key = process.env.GOODTAP_SIGNER_PRIVATE_KEY;
  if (!key) throw new Error('GOODTAP_SIGNER_PRIVATE_KEY is not configured');
  return privateKeyToAccount(key as Hex);
}

/** Signs an EIP-712 voucher for the player's cumulative earnings, redeemable via GoodTapArcade.claimRewards. */
export async function signRewardVoucher(player: string, earnedMilli: number) {
  if (!chainConfig.arcadeAddress) throw new Error('Arcade contract is not configured');

  const cumulativeAmount = parseUnits((earnedMilli / 1000).toFixed(3), chainConfig.tokenDecimals);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS);

  const signature = await getSigner().signTypedData({
    domain: {
      name: 'GoodTapArcade',
      version: '1',
      chainId: chainConfig.chain.id,
      verifyingContract: chainConfig.arcadeAddress,
    },
    types: rewardVoucherTypes,
    primaryType: 'RewardVoucher',
    message: { player: getAddress(player), cumulativeAmount, deadline },
  });

  return { cumulativeAmount: cumulativeAmount.toString(), deadline: deadline.toString(), signature };
}
