import { NextResponse } from 'next/server';
import { onChainMode } from '@/lib/chain/config';
import { getTodayKey, getWeekKey } from '@/lib/game-rules';
import { prisma } from '@/lib/prisma';
import { SHOP_ITEMS } from '@/lib/shop-catalog';
import { parsePurchases, toSnapshot } from '@/lib/server/player';
import { getSessionPlayer } from '@/lib/server/session';

const DAILY_REWARD = 1;
const STREAK_BONUS = 0.2;
const MAX_BONUS_DAYS = 7;

/** Off-chain stand-in for the Xurri contracts (gift, shop, pot boosts), used until contract addresses are configured. */
export async function POST(request: Request) {
  if (onChainMode) return NextResponse.json({ error: 'Demo economy is disabled' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { action?: 'claim' | 'buy' | 'boost'; slug?: string; amount?: number };
  const player = await getSessionPlayer();
  const today = getTodayKey();

  if (body.action === 'claim') {
    if (player.demoLastClaim === today) return NextResponse.json({ error: 'Already claimed today' }, { status: 409 });
    const yesterday = getTodayKey(new Date(Date.now() - 86400000));
    const streak = player.demoLastClaim === yesterday ? player.demoStreak + 1 : 1;
    const amount = DAILY_REWARD + STREAK_BONUS * Math.min(streak - 1, MAX_BONUS_DAYS);
    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { demoLastClaim: today, demoStreak: streak, demoBalance: { increment: amount } },
    });
    return NextResponse.json({ amount, player: toSnapshot(updated) });
  }

  if (body.action === 'buy') {
    const item = SHOP_ITEMS.find((entry) => entry.slug === body.slug);
    if (!item) return NextResponse.json({ error: 'Unknown item' }, { status: 404 });
    const purchases = parsePurchases(player.demoPurchases);
    if (purchases.includes(item.slug)) return NextResponse.json({ error: 'Already owned' }, { status: 409 });
    if (player.demoBalance < item.price) return NextResponse.json({ error: 'Not enough G$' }, { status: 400 });
    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { demoBalance: { decrement: item.price }, demoPurchases: JSON.stringify([...purchases, item.slug]) },
    });
    return NextResponse.json({ player: toSnapshot(updated) });
  }

  if (body.action === 'boost') {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) return NextResponse.json({ error: 'Pick an amount' }, { status: 400 });
    if (player.demoBalance < amount) return NextResponse.json({ error: 'Not enough G$' }, { status: 400 });
    // Like the contract: 10% goes to the UBI pool, the rest to this week's pot.
    const toPotMilli = Math.round(amount * 1000 * 0.9);
    const [updated] = await prisma.$transaction([
      prisma.player.update({ where: { id: player.id }, data: { demoBalance: { decrement: amount } } }),
      prisma.potBoost.create({ data: { weekKey: getWeekKey(), playerId: player.id, amountMilli: toPotMilli } }),
    ]);
    return NextResponse.json({ player: toSnapshot(updated) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
