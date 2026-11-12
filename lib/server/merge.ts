import { createHmac } from 'node:crypto';
import { getSecret } from '@/lib/server/session';

/** Today's puzzle seed. Derived from a server secret so nobody can solve tomorrow's board in advance. */
export function dailySeed(day: string) {
  return createHmac('sha256', getSecret()).update(`merge:${day}`).digest().readUInt32BE(0) & 0x7fffffff;
}

export function msUntilTomorrow(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime();
}
