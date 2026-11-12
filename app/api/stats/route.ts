import { NextResponse } from 'next/server';
import { getStats } from '@/lib/server/stats';

/** Public numbers for dashboards and grant reporting. */
export async function GET() {
  return NextResponse.json(await getStats());
}
