import { privateKeyToAccount } from 'viem/accounts';
import { getAddress, parseUnits, type Hex } from 'viem';
import { chainConfig } from '@/lib/chain/config';
import { prizeTicketTypes } from '@/lib/chain/abi';

const VOUCHER_TTL_SECONDS = 60 * 30;

function getSigner() {
  const key = process.env.XURRI_SIGNER_PRIVATE_KEY;
  if (!key) throw new Error('XURRI_SIGNER_PRIVATE_KEY is not configured');
  return privateKeyToAccount(key as Hex);
}

/** Signs an EIP-712 prize ticket for the player's cumulative tournament prizes, redeemable via XurriTournaments.claimPrizes. */
export async function signRewardVoucher(player: string, earnedMilli: number) {
  if (!chainConfig.tournamentsAddress) throw new Error('Tournaments contract is not configured');

  const cumulativeAmount = parseUnits((earnedMilli / 1000).toFixed(3), chainConfig.tokenDecimals);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS);

  const signature = await getSigner().signTypedData({
    domain: {
      name: 'XurriTournaments',
      version: '1',
      chainId: chainConfig.chain.id,
      verifyingContract: chainConfig.tournamentsAddress,
    },
    types: prizeTicketTypes,
    primaryType: 'PrizeTicket',
    message: { player: getAddress(player), cumulativeAmount, deadline },
  });

  return { cumulativeAmount: cumulativeAmount.toString(), deadline: deadline.toString(), signature };
}

