import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type LeaderboardEntry = {
  name: string;
  score: number;
  badge: string;
};

const defaultEntries: LeaderboardEntry[] = [
  { name: 'Nova', score: 15240, badge: '🏆' },
  { name: 'Pixel', score: 13880, badge: '🥈' },
  { name: 'Orbit', score: 12110, badge: '🥉' },
  { name: 'Luma', score: 10860, badge: '✨' },
  { name: 'Milo', score: 9250, badge: '🔥' },
];

export async function GET() {
  const dbEntries = await prisma.leaderboardEntry.findMany({ orderBy: { score: 'desc' }, take: 5 });

  if (dbEntries.length === 0) {
    await prisma.leaderboardEntry.createMany({ data: defaultEntries.map((entry) => ({ ...entry, name: entry.name })) });
    return NextResponse.json({ entries: defaultEntries });
  }

  return NextResponse.json({
    entries: dbEntries.map((entry) => ({
      name: entry.name,
      score: entry.score,
      badge: entry.badge,
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'update' | 'add';
    name?: string;
    score?: number;
    entry?: LeaderboardEntry;
  };

  if (body.action === 'update' && body.name && typeof body.score === 'number') {
    const existing = await prisma.leaderboardEntry.findUnique({ where: { name: body.name } });

    if (existing) {
      const updated = await prisma.leaderboardEntry.update({
        where: { id: existing.id },
        data: { score: Math.max(existing.score, body.score) },
      });

      const all = await prisma.leaderboardEntry.findMany({ orderBy: { score: 'desc' }, take: 5 });
      return NextResponse.json({ entries: all.map((entry) => ({ name: entry.name, score: entry.score, badge: entry.badge })) });
    }

    const created = await prisma.leaderboardEntry.create({
      data: { name: body.name, score: body.score, badge: '✨' },
    });

    const all = await prisma.leaderboardEntry.findMany({ orderBy: { score: 'desc' }, take: 5 });
    return NextResponse.json({ entries: all.map((entry) => ({ name: entry.name, score: entry.score, badge: entry.badge })) });
  }

  if (body.action === 'add' && body.entry) {
    const existing = await prisma.leaderboardEntry.findUnique({ where: { name: body.entry.name } });

    if (existing) {
      const updated = await prisma.leaderboardEntry.update({
        where: { id: existing.id },
        data: { score: Math.max(existing.score, body.entry.score), badge: body.entry.badge },
      });

      const all = await prisma.leaderboardEntry.findMany({ orderBy: { score: 'desc' }, take: 5 });
      return NextResponse.json({ entries: all.map((entry) => ({ name: entry.name, score: entry.score, badge: entry.badge })) });
    }

    await prisma.leaderboardEntry.create({
      data: { name: body.entry.name, score: body.entry.score, badge: body.entry.badge },
    });
  }

  const all = await prisma.leaderboardEntry.findMany({ orderBy: { score: 'desc' }, take: 5 });
  return NextResponse.json({ entries: all.map((entry) => ({ name: entry.name, score: entry.score, badge: entry.badge })) });
}
