import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { Player } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE = 'gt_session';
const NONCE_COOKIE = 'gt_nonce';
const SESSION_MAX_AGE = 60 * 60 * 24 * 180;
const NONCE_MAX_AGE = 60 * 10;

export function getSecret() {
  const secret = process.env.XURRI_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('XURRI_SESSION_SECRET must be set to at least 32 characters in production');
  }
  return 'xurri-dev-only-session-secret-change-me';
}

const sign = (value: string) => createHmac('sha256', getSecret()).update(value).digest('base64url');

function seal(value: string) {
  return `${value}.${sign(value)}`;
}

function unseal(sealed: string | undefined) {
  if (!sealed) return null;
  const dot = sealed.lastIndexOf('.');
  if (dot <= 0) return null;
  const value = sealed.slice(0, dot);
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(sealed.slice(dot + 1));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return value;
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge,
});

export async function setSessionPlayer(playerId: string) {
  (await cookies()).set(SESSION_COOKIE, seal(playerId), cookieOptions(SESSION_MAX_AGE));
}

/** Returns the session's player, creating a guest player (and cookie) on first visit. */
export async function getSessionPlayer(): Promise<Player> {
  const store = await cookies();
  const playerId = unseal(store.get(SESSION_COOKIE)?.value);

  if (playerId) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (player) return player;
  }

  const player = await prisma.player.create({ data: {} });
  await setSessionPlayer(player.id);
  return player;
}

export async function startGuestSession() {
  const player = await prisma.player.create({ data: {} });
  await setSessionPlayer(player.id);
  return player;
}

export async function issueNonce() {
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  (await cookies()).set(NONCE_COOKIE, seal(`${nonce}|${issuedAt}`), cookieOptions(NONCE_MAX_AGE));
  return { nonce, issuedAt };
}

/** Returns the pending nonce once, then clears it so a signature can't be replayed. */
export async function consumeNonce() {
  const store = await cookies();
  const value = unseal(store.get(NONCE_COOKIE)?.value);
  store.delete(NONCE_COOKIE);
  if (!value) return null;
  const [nonce, issuedAt] = value.split('|');
  if (Date.now() - new Date(issuedAt).getTime() > NONCE_MAX_AGE * 1000) return null;
  return { nonce, issuedAt };
}

export function signInMessage(address: string, nonce: string, issuedAt: string) {
  return [
    'Sign in to Xurri',
    '',
    'This just proves the wallet is yours. It’s free and doesn’t move any money.',
    '',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}
