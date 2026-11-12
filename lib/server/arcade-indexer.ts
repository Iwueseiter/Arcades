import { createPublicClient, http, parseEventLogs } from 'viem';
import { arcadeAbi } from '@/lib/chain/abi';
import { chainConfig } from '@/lib/chain/config';
import { prisma } from '@/lib/prisma';

const BLOCKS_PER_SYNC = 10_000n;
const FINALITY_BUFFER = 5n;

const publicClient = createPublicClient({
  chain: chainConfig.chain,
  transport: http(chainConfig.rpcUrl),
});

function getDeploymentBlock() {
  const value = process.env.XURRI_ARCADE_DEPLOY_BLOCK;
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error('XURRI_ARCADE_DEPLOY_BLOCK must be a non-negative block number');
  return BigInt(value);
}

export async function syncArcadeEvents() {
  if (!chainConfig.arcadeAddress) return { status: 'not-configured' as const };

  const deploymentBlock = getDeploymentBlock();
  if (deploymentBlock === null) return { status: 'deployment-block-required' as const };

  const contractAddress = chainConfig.arcadeAddress.toLowerCase();
  const indexStateId = `${chainConfig.chain.id}:${contractAddress}:${deploymentBlock}`;
  const [state, latestBlock] = await Promise.all([
    prisma.arcadeIndexState.findUnique({ where: { id: indexStateId } }),
    publicClient.getBlockNumber(),
  ]);
  const safeHead = latestBlock > FINALITY_BUFFER ? latestBlock - FINALITY_BUFFER : latestBlock;
  const fromBlock = state?.lastIndexedBlock === null || state?.lastIndexedBlock === undefined
    ? deploymentBlock
    : state.lastIndexedBlock + 1n;

  if (fromBlock > safeHead) {
    if (deploymentBlock > safeHead) {
      return { status: 'waiting-for-deployment-block' as const, latestBlock: latestBlock.toString() };
    }
    return {
      status: 'synced' as const,
      indexedThrough: (state?.lastIndexedBlock ?? safeHead).toString(),
      latestBlock: latestBlock.toString(),
    };
  }

  const toBlock = fromBlock + BLOCKS_PER_SYNC - 1n < safeHead ? fromBlock + BLOCKS_PER_SYNC - 1n : safeHead;
  const logs = await publicClient.getLogs({
    address: chainConfig.arcadeAddress,
    fromBlock,
    toBlock,
  });
  const parsedLogs = parseEventLogs({ abi: arcadeAbi, logs, strict: false });
  const events = parsedLogs.flatMap((log) => {
    if (!log.transactionHash || log.logIndex === null) return [];

    let playerAddress: string | null = null;
    let amount: string | null = null;
    switch (log.eventName) {
      case 'GameStarted':
        playerAddress = typeof log.args?.player === 'string' ? log.args.player.toLowerCase() : null;
        break;
      case 'DailyClaimed':
      case 'RewardsClaimed':
        playerAddress = typeof log.args?.player === 'string' ? log.args.player.toLowerCase() : null;
        amount = typeof log.args?.amount === 'bigint' ? log.args.amount.toString() : null;
        break;
      case 'ReferralPaid':
        playerAddress = typeof log.args?.referrer === 'string' ? log.args.referrer.toLowerCase() : null;
        amount = typeof log.args?.amount === 'bigint' ? log.args.amount.toString() : null;
        break;
      case 'ReferrerSet':
        playerAddress = typeof log.args?.player === 'string' ? log.args.player.toLowerCase() : null;
        break;
      case 'ItemPurchased':
        playerAddress = typeof log.args?.player === 'string' ? log.args.player.toLowerCase() : null;
        amount = typeof log.args?.price === 'bigint' ? log.args.price.toString() : null;
        break;
      default:
        return [];
    }

    if (!playerAddress) return [];

    return [{
      id: `${contractAddress}-${log.transactionHash.toLowerCase()}-${log.logIndex}`,
      txHash: log.transactionHash.toLowerCase(),
      chainId: chainConfig.chain.id,
      contractAddress,
      eventName: log.eventName,
      playerAddress,
      amount,
      blockNumber: log.blockNumber,
    }];
  });
  const transactions = new Map(
    events.map((event) => [event.txHash, event.blockNumber]),
  );

  await prisma.$transaction(async (tx) => {
    for (const event of events) {
      await tx.arcadeContractEvent.upsert({
        where: { id: event.id },
        create: event,
        update: event,
      });
    }

    for (const [txHash, blockNumber] of transactions) {
      await tx.arcadeContractTransaction.upsert({
        where: { id: `${chainConfig.chain.id}:${contractAddress}:${txHash}` },
        create: {
          id: `${chainConfig.chain.id}:${contractAddress}:${txHash}`,
          txHash,
          chainId: chainConfig.chain.id,
          contractAddress,
          blockNumber,
        },
        update: { blockNumber },
      });
    }

    await tx.arcadeIndexState.upsert({
      where: { id: indexStateId },
      create: { id: indexStateId, lastIndexedBlock: toBlock },
      update: { lastIndexedBlock: toBlock },
    });
  });

  return {
    status: toBlock < safeHead ? 'syncing' as const : 'synced' as const,
    indexedThrough: toBlock.toString(),
    latestBlock: latestBlock.toString(),
    indexedEvents: events.length,
  };
}
