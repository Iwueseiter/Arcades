import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/server/admin-auth';

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Admin sign-in required' }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  const query = search.get('q')?.trim().slice(0, 80) ?? '';
  const page = Math.max(0, Number.parseInt(search.get('page') ?? '0', 10) || 0);
  const where = query
    ? {
        OR: [
          { id: { contains: query } },
          { name: { contains: query } },
          { address: { contains: query.toLowerCase() } },
        ],
      }
    : {};

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * 50,
      take: 50,
      select: {
        id: true,
        name: true,
        address: true,
        gamesPlayed: true,
        bestScore: true,
        totalScore: true,
        earnedMilli: true,
        createdAt: true,
      },
    }),
    prisma.player.count({ where }),
  ]);

  return NextResponse.json(
    { players, total, page, pageSize: 50 },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
