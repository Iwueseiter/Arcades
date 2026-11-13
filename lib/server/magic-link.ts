import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/server/email';

const LINK_TTL_MS = 15 * 60_000;
const MAX_LINKS_PER_WINDOW = 3;
const WINDOW_MS = 15 * 60_000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const isEmail = (value: string) => value.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * The address links point to. In production it must come from NEXT_PUBLIC_APP_URL, never from the
 * request: a forged Host header would otherwise let an attacker email real players a link to their site.
 */
function appUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_APP_URL must be set to send sign-in links');
  return new URL(request.url).origin;
}

/** Emails a one-time sign-in link. Returns false when this address asked for too many links recently. */
export async function sendMagicLink(email: string, request: Request) {
  const recent = await prisma.emailLoginToken.count({ where: { email, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } } });
  if (recent >= MAX_LINKS_PER_WINDOW) return false;

  const token = randomBytes(32).toString('base64url');
  await prisma.emailLoginToken.create({
    data: { email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LINK_TTL_MS) },
  });

  const url = `${appUrl(request)}/api/auth/email/verify?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Your Xurri sign-in link',
    text: `Tap to sign in to Xurri:\n\n${url}\n\nThe link works once and expires in 15 minutes. If you didn’t ask for it, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;color:#16181d">
  <h1 style="font-size:24px;margin:0 0 8px"><span style="color:#ff6a2b">X</span>urri</h1>
  <p style="font-size:16px;line-height:1.5">Tap the button to sign in. Your scores and progress come with you.</p>
  <p style="margin:24px 0"><a href="${url}" style="background:#ff6a2b;color:#fff;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:700;display:inline-block">Sign in to Xurri</a></p>
  <p style="font-size:13px;color:#6b6f78">The link works once and expires in 15 minutes. If you didn’t ask for it, you can ignore this email.</p>
</div>`,
  });
  return true;
}

/** Spends a sign-in token. Returns its email, or null if the token is unknown, used or expired. */
export async function consumeMagicLink(token: string) {
  const tokenHash = hashToken(token);
  const row = await prisma.emailLoginToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  // Only one request can mark it used, so a link can't be opened twice in a race.
  const claimed = await prisma.emailLoginToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return claimed.count === 1 ? row.email : null;
}
