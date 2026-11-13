import { parseAbi, parseEventLogs, type Address } from 'viem';
import { chainConfig } from '@/lib/chain/config';
import { prisma } from '@/lib/prisma';
import { publicClient } from '@/lib/server/chain';

const BLOCKS_PER_SYNC = 4_000n;
const FINALITY_BUFFER = 5n;

/** Events from the three Xurri contracts that the analytics page counts. */
const indexedEvents = parseAbi([
  'event GiftClaimed(address indexed player, address indexed human, uint256 amount, uint32 streak, uint64 day)',
  'event GameStarted(address indexed player, address indexed human, uint64 indexed week, uint64 day, uint32 playNumber)',
  'event PotBoosted(address indexed from, uint64 indexed week, uint256 amount, uint256 toPot, uint256 toUbi)',
  'event PrizesClaimed(address indexed player, uint256 amount, uint256 cumulativeAmount)',
  'event ItemBought(address indexed player, bytes32 indexed itemId, uint256 price, uint256 toPot, uint256 toUbi)',
  'event UbiFunded(address indexed recipient, uint256 amount)',
]);

/** G$ Xurri paid out to players. */
export const PAYOUT_EVENTS = ['GiftClaimed', 'PrizesClaimed'];
/** G$ players spent in Xurri. */
export const SPEND_EVENTS = ['PotBoosted', 'ItemBought'];
/** G$ sent on to GoodDollar's UBI pool. */
export const UBI_EVENTS = ['UbiFunded'];

export function indexedContracts(): Address[] {
  const { giftAddress, tournamentsAddress, shopAddress } = chainConfig;
  return [giftAddress, tournamentsAddress, shopAddress].filter((address): address is Address => address !== null);
}

function getDeploymentBlock() {
  const value = process.env.XURRI_DEPLOY_BLOCK;
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error('XURRI_DEPLOY_BLOCK must be a non-negative block number');
  return BigInt(value);
}

/** Who acted and how much G$ moved, for each indexed event. */
function eventDetails(log: ReturnType<typeof parseEventLogs<typeof indexedEvents>>[number]) {
  switch (log.eventName) {
    case 'GiftClaimed':
    case 'PrizesClaimed':
      return { playerAddress: log.args.player, amount: log.args.amount };
    case 'GameStarted':
      return { playerAddress: log.args.player, amount: null };
    case 'PotBoosted':
      return { playerAddress: log.args.from, amount: log.args.amount };
    case 'ItemBought':
      return { playerAddress: log.args.player, amount: log.args.price };
    case 'UbiFunded':
      return { playerAddress: log.args.recipient, amount: log.args.amount };
  }
}

/** Reads the next batch of contract history into the database. Safe to call repeatedly. */
export async function syncArcadeEvents() {
  const contracts = indexedContracts();
  if (!contracts.length) return { status: 'not-configured' as const };

  const deploymentBlock = getDeploymentBlock();
  if (deploymentBlock === null) return { status: 'deployment-block-required' as const };

  const indexStateId = `${chainConfig.chain.id}:${contracts.map((address) => address.toLowerCase()).join(',')}:${deploymentBlock}`;
  const [state, latestBlock] = await Promise.all([
    prisma.arcadeIndexState.findUnique({ where: { id: indexStateId } }),
    publicClient.getBlockNumber(),
  ]);
  const safeHead = latestBlock > FINALITY_BUFFER ? latestBlock - FINALITY_BUFFER : latestBlock;
  const fromBlock = state ? state.lastIndexedBlock + 1n : deploymentBlock;

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
  const logs = await publicClient.getLogs({ address: contracts, fromBlock, toBlock });
  const events = parseEventLogs({ abi: indexedEvents, logs }).flatMap((log) => {
    if (!log.transactionHash || log.logIndex === null) return [];
    const { playerAddress, amount } = eventDetails(log);
    const contractAddress = log.address.toLowerCase();
    return [
      {
        id: `${contractAddress}-${log.transactionHash.toLowerCase()}-${log.logIndex}`,
        txHash: log.transactionHash.toLowerCase(),
        chainId: chainConfig.chain.id,
        contractAddress,
        eventName: log.eventName,
        playerAddress: playerAddress.toLowerCase(),
        amount: amount === null ? null : amount.toString(),
        blockNumber: log.blockNumber,
      },
    ];
  });
  const transactions = new Map(events.map((event) => [`${event.contractAddress}:${event.txHash}`, event]));

  await prisma.$transaction(async (tx) => {
    for (const event of events) {
      await tx.arcadeContractEvent.upsert({ where: { id: event.id }, create: event, update: event });
    }

    for (const [key, event] of transactions) {
      const id = `${chainConfig.chain.id}:${key}`;
      const data = { txHash: event.txHash, chainId: event.chainId, contractAddress: event.contractAddress, blockNumber: event.blockNumber };
      await tx.arcadeContractTransaction.upsert({ where: { id }, create: { id, ...data }, update: { blockNumber: event.blockNumber } });
    }

    await tx.arcadeIndexState.upsert({
      where: { id: indexStateId },
      create: { id: indexStateId, lastIndexedBlock: toBlock },
      update: { lastIndexedBlock: toBlock },
    });
  });

  return {
    status: toBlock < safeHead ? ('syncing' as const) : ('synced' as const),
    indexedThrough: toBlock.toString(),
    latestBlock: latestBlock.toString(),
    indexedEvents: events.length,
  };
}
