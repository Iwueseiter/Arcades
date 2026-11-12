import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getSecret } from '@/lib/server/secrets';

const ADMIN_COOKIE = 'xurri_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 8;

const getCredentials = () => {
  const email = process.env.XURRI_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.XURRI_ADMIN_PASSWORD;
  return email && password && password.length >= 16 ? { email, password } : null;
};

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const signature = (payload: string) =>
  createHmac('sha256', getSecret()).update(`xurri-admin:${payload}`).digest('base64url');

const credentialVersion = (password: string) =>
  createHmac('sha256', getSecret()).update(`xurri-admin-password:${password}`).digest('base64url');

export function isAdminLoginConfigured() {
  return getCredentials() !== null;
}

export function verifyAdminCredentials(email: string, password: string) {
  const credentials = getCredentials();
  if (!credentials) return false;
  return safeEqual(email.trim().toLowerCase(), credentials.email) && safeEqual(password, credentials.password);
}

export async function setAdminSession() {
  const credentials = getCredentials();
  if (!credentials) throw new Error('Admin login is not configured');

  const payload = Buffer.from(
    JSON.stringify({
      email: credentials.email,
      expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
      credentialVersion: credentialVersion(credentials.password),
    }),
  ).toString('base64url');
  (await cookies()).set(ADMIN_COOKIE, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function isAdminAuthenticated() {
  const credentials = getCredentials();
  const sealed = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!credentials || !sealed) return false;

  const separator = sealed.lastIndexOf('.');
  if (separator <= 0) return false;

  const payload = sealed.slice(0, separator);
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(sealed.slice(separator + 1));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: unknown;
      expiresAt?: unknown;
      credentialVersion?: unknown;
    };
    return (
      typeof session.email === 'string' &&
      safeEqual(session.email, credentials.email) &&
      typeof session.expiresAt === 'number' &&
      session.expiresAt > Date.now() &&
      typeof session.credentialVersion === 'string' &&
      safeEqual(session.credentialVersion, credentialVersion(credentials.password))
    );
  } catch {
    return false;
  }
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
