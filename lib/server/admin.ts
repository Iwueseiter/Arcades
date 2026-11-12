import { timingSafeEqual } from 'node:crypto';
import { isAdminAuthenticated } from '@/lib/server/admin-auth';

/** True when the request carries `Authorization: Bearer <secret>` for the secret in env var `name`. */
export function hasBearerSecret(request: Request, name: 'XURRI_ADMIN_SECRET' | 'CRON_SECRET') {
  const secret = process.env[name];
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Admin access for the review tools: the /admin login session, or the bearer secret for scripts. */
export async function isAdminRequest(request: Request) {
  return hasBearerSecret(request, 'XURRI_ADMIN_SECRET') || (await isAdminAuthenticated());
}
