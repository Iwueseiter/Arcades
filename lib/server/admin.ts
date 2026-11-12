import { timingSafeEqual } from 'node:crypto';

/** True when the request carries `Authorization: Bearer <secret>` for the secret in env var `name`. */
export function hasBearerSecret(request: Request, name: 'XURRI_ADMIN_SECRET' | 'CRON_SECRET') {
  const secret = process.env[name];
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
