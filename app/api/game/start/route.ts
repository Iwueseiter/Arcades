import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createPublicClient, http, isHash, parseEventLogs, type Hash } from 'viem';
import { tournamentsAbi } from '@/lib/chain/abi';
import { chainConfig, onChainMode, tournamentsEnabled } from '@/lib/chain/config';
import { MAX_ROUNDS_PER_DAY, getTodayKey } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { roundsUsedToday, toSnapshot } from '@/lib/server/player';
import { getSessionPlayer } from '@/lib/server/session';

const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) });

/**
 * Finds a successful startGame call on our contract made by `player` in transaction `hash`, and returns
 * the GoodDollar identity (the person) it was counted for, or null if there isn't one.
 */
async function paidStartHuman(hash: Hash, player: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 20_000 }).catch(() => null);
  if (!receipt || receipt.status !== 'success') return null;
  const events = parseEventLogs({ abi: tournamentsAbi, eventName: 'GameStarted', logs: receipt.logs });
  const event = events.find(
    (entry) =>
      entry.address.toLowerCase() === chainConfig.tournamentsAddress?.toLowerCase() && entry.args.player.toLowerCase() === player,
  );
  return event ? event.args.human.toLowerCase() : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { txHash?: string };
  const player = await getSessionPlayer();
  const used = roundsUsedToday(player);
  let ranked = used < MAX_ROUNDS_PER_DAY;
  let txHash: string | null = null;
  let root: string | null = player.identityRoot;

  if (!tournamentsEnabled) {
    // No tournaments: every game counts for the weekly board, which has no prizes, so no limits apply.
    ranked = true;
  } else if (onChainMode) {
    // On-chain, a tournament game must be started with a startGame transaction; without one it's practice.
    if (body.txHash) {
      if (!player.address || !isHash(body.txHash)) return NextResponse.json({ error: 'Connect your wallet to play in the tournament' }, { status: 400 });
      if (await prisma.gameRound.findUnique({ where: { txHash: body.txHash.toLowerCase() } })) {
        return NextResponse.json({ error: 'That game was already started' }, { status: 409 });
      }
      const human = await paidStartHuman(body.txHash as Hash, player.address);
      if (!human) return NextResponse.json({ error: 'We couldn’t find your game on Celo. Please try again.' }, { status: 400 });
      txHash = body.txHash.toLowerCase();
      root = human;
    } else {
      ranked = false;
    }
  }

  const [round, updated] = await prisma.$transaction([
    prisma.gameRound.create({ data: { playerId: player.id, seed: randomInt(1, 2 ** 31 - 1), ranked, txHash } }),
    prisma.player.update({
      where: { id: player.id },
      data: ranked ? { roundsDay: getTodayKey(), roundsUsed: used + 1, identityRoot: root } : {},
    }),
  ]);

  return NextResponse.json({ roundId: round.id, seed: round.seed, ranked, player: toSnapshot(updated) });
}
