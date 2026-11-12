import { NextResponse } from 'next/server';
import { toSnapshot } from '@/lib/server/player';
import { startGuestSession } from '@/lib/server/session';

export async function POST() {
  const player = await startGuestSession();
  return NextResponse.json(toSnapshot(player));
}
