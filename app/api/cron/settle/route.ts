import { NextResponse } from 'next/server';
import { tournamentsEnabled } from '@/lib/chain/config';
import { hasBearerSecret } from '@/lib/server/admin';
import { settleDueTournaments } from '@/lib/server/tournament';

/** Called hourly by the scheduler (see vercel.json) to hand out finished tournaments' prizes. */
export async function GET(request: Request) {
  if (!hasBearerSecret(request, 'CRON_SECRET')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const settled = tournamentsEnabled ? await settleDueTournaments() : [];
  return NextResponse.json({ settled });
}
