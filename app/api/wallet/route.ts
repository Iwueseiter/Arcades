import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type WalletSnapshot = {
  balance: number;
  purchases: string[];
};

export async function GET() {
  const wallet = await prisma.wallet.findFirst();

  if (!wallet) {
    const created = await prisma.wallet.create({
      data: {
        balance: 24.5,
        purchases: '[]',
      },
    });

    return NextResponse.json({ balance: created.balance, purchases: JSON.parse(created.purchases) as string[] });
  }

  return NextResponse.json({
    balance: wallet.balance,
    purchases: JSON.parse(wallet.purchases) as string[],
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'add' | 'spend' | 'buy';
    amount?: number;
    itemId?: string;
  };

  const wallet = (await prisma.wallet.findFirst()) ?? (await prisma.wallet.create({
    data: {
      balance: 24.5,
      purchases: '[]',
    },
  }));

  const purchases = JSON.parse(wallet.purchases) as string[];
  const next = {
    balance: wallet.balance,
    purchases: [...purchases],
  };

  if (body.action === 'add' && typeof body.amount === 'number') {
    next.balance = Number((next.balance + body.amount).toFixed(2));
  }

  if (body.action === 'spend' && typeof body.amount === 'number') {
    if (next.balance < body.amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    next.balance = Number((next.balance - body.amount).toFixed(2));
  }

  if (body.action === 'buy' && typeof body.amount === 'number' && body.itemId) {
    if (next.balance < body.amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    next.balance = Number((next.balance - body.amount).toFixed(2));
    if (!next.purchases.includes(body.itemId)) {
      next.purchases.push(body.itemId);
    }
  }

  const saved = await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: next.balance,
      purchases: JSON.stringify(next.purchases),
    },
  });

  return NextResponse.json({
    balance: saved.balance,
    purchases: JSON.parse(saved.purchases) as string[],
  });
}
