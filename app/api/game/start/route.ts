import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createPublicClient, http, isHash, parseEventLogs, type Hash } from 'viem';
import { arcadeAbi } from '@/lib/chain/abi';
import { chainConfig, onChainMode } from '@/lib/chain/config';
import { MAX_ROUNDS_PER_DAY, getTodayKey } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { roundsUsedToday, toSnapshot } from '@/lib/server/player';
import { getSessionPlayer } from '@/lib/server/session';

const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) });

/** True when `hash` is a successful startGame call on our contract, made by `player`. */
async function isPaidStart(hash: Hash, player: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 20_000 }).catch(() => null);
  if (!receipt || receipt.status !== 'success') return false;
  const events = parseEventLogs({ abi: arcadeAbi, eventName: 'GameStarted', logs: receipt.logs });
  return events.some(
    (event) => event.address.toLowerCase() === chainConfig.arcadeAddress?.toLowerCase() && event.args.player.toLowerCase() === player,
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { txHash?: string };
  const player = await getSessionPlayer();
  const used = roundsUsedToday(player);
  let ranked = used < MAX_ROUNDS_PER_DAY;
  let txHash: string | null = null;

  // On-chain, a prize game must be paid for with a startGame transaction; without one it's free play.
  if (onChainMode) {
    if (body.txHash) {
      if (!player.address || !isHash(body.txHash)) return NextResponse.json({ error: 'Connect your wallet to play for prizes' }, { status: 400 });
      if (await prisma.gameRound.findUnique({ where: { txHash: body.txHash.toLowerCase() } })) {
        return NextResponse.json({ error: 'That game was already started' }, { status: 409 });
      }
      if (!(await isPaidStart(body.txHash as Hash, player.address))) {
        return NextResponse.json({ error: 'We couldn’t find your game on Celo. Please try again.' }, { status: 400 });
      }
      txHash = body.txHash.toLowerCase();
    } else {
      ranked = false;
    }
  }

  const [round, updated] = await prisma.$transaction([
    prisma.gameRound.create({ data: { playerId: player.id, seed: randomInt(1, 2 ** 31 - 1), ranked, txHash } }),
    prisma.player.update({
      where: { id: player.id },
      data: ranked ? { roundsDay: getTodayKey(), roundsUsed: used + 1 } : {},
    }),
  ]);

  return NextResponse.json({ roundId: round.id, seed: round.seed, ranked, player: toSnapshot(updated) });
}
