import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/server/admin-auth';

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Admin sign-in required' }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  const page = Math.max(0, Number.parseInt(search.get('page') ?? '0', 10) || 0);
  const [rounds, total] = await Promise.all([
    prisma.gameRound.findMany({
      orderBy: { startedAt: 'desc' },
      skip: page * 50,
      take: 50,
      select: {
        id: true,
        seed: true,
        ranked: true,
        startedAt: true,
        finishedAt: true,
        score: true,
        weekKey: true,
        flagged: true,
        txHash: true,
        player: { select: { id: true, name: true, address: true } },
      },
    }),
    prisma.gameRound.count(),
  ]);

  return NextResponse.json(
    { rounds, total, page, pageSize: 50 },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
