import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type ProfileRecord = {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  streak: number;
  gamesPlayed: number;
  totalScore: number;
  lastClaimDate: string | null;
  dailyReward: number;
};

const defaultProfile: Omit<ProfileRecord, 'id'> = {
  name: '',
  email: '',
  verified: false,
  streak: 0,
  gamesPlayed: 0,
  totalScore: 0,
  lastClaimDate: null,
  dailyReward: 2.4,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getNextStreak = (currentStreak: number, lastClaimDate: string | null) => {
  if (!lastClaimDate) {
    return 1;
  }

  const today = new Date();
  const lastDate = new Date(`${lastClaimDate}T12:00:00Z`);
  const diffDays = Math.round((today.getTime() - lastDate.getTime()) / 86400000);

  if (diffDays === 1) {
    return currentStreak + 1;
  }

  if (diffDays === 0) {
    return currentStreak;
  }

  return 1;
};

const serializeProfile = (profile: {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  streak: number;
  gamesPlayed: number;
  totalScore: number;
  lastClaimDate: string | null;
  dailyReward: number;
}): ProfileRecord => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  verified: profile.verified,
  streak: profile.streak,
  gamesPlayed: profile.gamesPlayed,
  totalScore: profile.totalScore,
  lastClaimDate: profile.lastClaimDate,
  dailyReward: profile.dailyReward,
});

export async function GET() {
  let profile = await prisma.profile.findFirst();

  if (!profile) {
    profile = await prisma.profile.create({
      data: defaultProfile,
    });
  }

  return NextResponse.json(serializeProfile(profile));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'signup' | 'claim' | 'record-game';
    name?: string;
    email?: string;
    score?: number;
  };

  let profile = (await prisma.profile.findFirst()) ?? (await prisma.profile.create({ data: defaultProfile }));

  if (body.action === 'signup') {
    const name = (body.name ?? profile.name ?? 'Player One').trim() || 'Player One';
    const email = (body.email ?? profile.email ?? 'player@goodtap.app').trim() || 'player@goodtap.app';

    profile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        name,
        email,
        verified: true,
        streak: profile.streak || 1,
      },
    });

    return NextResponse.json(serializeProfile(profile));
  }

  if (body.action === 'claim') {
    const todayKey = getTodayKey();
    if (profile.lastClaimDate === todayKey) {
      return NextResponse.json(serializeProfile(profile));
    }

    const nextStreak = getNextStreak(profile.streak, profile.lastClaimDate);
    profile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        lastClaimDate: todayKey,
        streak: nextStreak,
        verified: true,
      },
    });

    return NextResponse.json(serializeProfile(profile));
  }

  if (body.action === 'record-game' && typeof body.score === 'number') {
    const safeScore = Math.max(0, Math.round(body.score));
    profile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        gamesPlayed: profile.gamesPlayed + 1,
        totalScore: profile.totalScore + safeScore,
        streak: profile.streak || 1,
      },
    });

    return NextResponse.json(serializeProfile(profile));
  }

  return NextResponse.json(serializeProfile(profile));
}
