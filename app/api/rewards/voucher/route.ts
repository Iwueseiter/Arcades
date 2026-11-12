import { NextResponse } from 'next/server';
import { onChainMode } from '@/lib/chain/config';
import { signRewardVoucher } from '@/lib/server/rewards';
import { findSessionPlayer } from '@/lib/server/session';

export async function POST() {
  if (!onChainMode) return NextResponse.json({ error: 'On-chain rewards are not enabled' }, { status: 400 });

  const player = await findSessionPlayer();
  if (!player?.address) return NextResponse.json({ error: 'Connect a wallet first' }, { status: 401 });
  if (player.banned) return NextResponse.json({ error: 'This account can’t collect prizes. Contact support.' }, { status: 403 });
  if (player.earnedMilli <= 0) return NextResponse.json({ error: 'No prizes won yet' }, { status: 400 });

  try {
    return NextResponse.json(await signRewardVoucher(player.address, player.earnedMilli));
  } catch (error) {
    console.error('voucher signing failed', error);
    return NextResponse.json({ error: 'Rewards are temporarily unavailable' }, { status: 503 });
  }
}
