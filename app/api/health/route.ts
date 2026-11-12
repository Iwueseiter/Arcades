import { NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { erc20Abi, giftAbi, shopAbi, tournamentsAbi } from '@/lib/chain/abi';
import { chainConfig, onChainMode, tournamentsEnabled } from '@/lib/chain/config';
import { prisma } from '@/lib/prisma';
import { publicClient, toG } from '@/lib/server/chain';
import { tournamentPrizes } from '@/lib/server/tournament';

type Check = { ok: boolean; detail?: string };

/**
 * Point an uptime monitor at this. It answers 503 when something needs a human: the database is
 * down, prize tickets can't be signed, a contract is paused, or the gift or prize pot is running dry.
 */
export async function GET() {
  const checks: Record<string, Check> = {};

  checks.database = await prisma.$queryRaw`SELECT 1`.then(
    () => ({ ok: true }),
    (error: Error) => ({ ok: false, detail: error.message.slice(0, 120) }),
  );

  const { giftAddress, tournamentsAddress, shopAddress, tokenAddress } = chainConfig;
  if (onChainMode && tournamentsAddress) {
    try {
      if (tournamentsEnabled) {
        const [pot, signer, tournamentsPaused] = await Promise.all([
          publicClient.readContract({
            address: tournamentsAddress,
            abi: tournamentsAbi,
            functionName: 'potBalance',
          }),
          publicClient.readContract({
            address: tournamentsAddress,
            abi: tournamentsAbi,
            functionName: 'signer',
          }),
          publicClient.readContract({
            address: tournamentsAddress,
            abi: tournamentsAbi,
            functionName: 'paused',
          }),
        ]);
        const weekly = tournamentPrizes().reduce((sum, prize) => sum + prize, 0);
        checks.prizePot = {
          ok: toG(pot) >= weekly * 2,
          detail: `${toG(pot).toFixed(0)} G$ (keep at least ${weekly * 2} G$: two weeks of prizes)`,
        };
        checks.tournaments = {
          ok: !tournamentsPaused,
          detail: tournamentsPaused ? 'paused' : 'live',
        };

        const key = process.env.XURRI_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
        const ours = key ? privateKeyToAccount(key).address : null;
        checks.signer = {
          ok: ours === signer,
          detail: !ours ? 'XURRI_SIGNER_PRIVATE_KEY missing' : ours === signer ? 'matches the contract' : 'does not match the contract signer',
        };
      }

      if (giftAddress) {
        const [balance, giftPaused] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [giftAddress],
          }),
          publicClient.readContract({
            address: giftAddress,
            abi: giftAbi,
            functionName: 'paused',
          }),
        ]);
        // Enough for about a week of gifts at 1,000 claims a day is a sensible floor at launch.
        checks.dailyGift = {
          ok: !giftPaused && toG(balance) >= 1000,
          detail: `${toG(balance).toFixed(0)} G$${giftPaused ? ', paused' : ''}`,
        };
      }
      if (shopAddress) {
        const shopPaused = await publicClient.readContract({
          address: shopAddress,
          abi: shopAbi,
          functionName: 'paused',
        });
        checks.shop = {
          ok: !shopPaused,
          detail: shopPaused ? 'paused' : 'live',
        };
      }
    } catch (error) {
      checks.chain = {
        ok: false,
        detail: `RPC error: ${(error as Error).message.slice(0, 120)}`,
      };
    }
  }

  const ok = Object.values(checks).every((check) => check.ok);
  return NextResponse.json(
    {
      ok,
      mode: onChainMode ? 'onchain' : 'demo',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
