import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeMagicLink } from '@/lib/server/magic-link';
import { getMagicAdmin } from '@/lib/server/magic-admin';
import { findSessionPlayer, setSessionPlayer } from '@/lib/server/session';
import { toSnapshot } from '@/lib/server/player';

/**
 * Verifies a Magic DIDToken and signs the player in.
 * Called by the client after magic.auth.loginWithEmailOTP() returns a DIDToken.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { didToken?: unknown };
  const didToken = typeof body.didToken === 'string' ? body.didToken : null;

  if (!didToken) {
    return NextResponse.json({ error: 'DID token is required.' }, { status: 400 });
  }

  let email: string;
  try {
    getMagicAdmin().token.validate(didToken);
    const metadata = await getMagicAdmin().users.getMetadataByToken(didToken);
    if (!metadata.email) throw new Error('No email in token metadata.');
    email = metadata.email.trim().toLowerCase();
  } catch (error) {
    console.error('[auth] magic token validation failed', error);
    return NextResponse.json({ error: 'Invalid or expired sign-in token. Please try again.' }, { status: 401 });
  }

  const player = await resolvePlayer(email);
  return NextResponse.json(toSnapshot(player));
}

/** Opened from the sign-in email link (backward-compat). Signs the player in and redirects to the app. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const email = token ? await consumeMagicLink(token) : null;
  if (!email) return NextResponse.redirect(new URL('/signin?link=expired', url));
  await resolvePlayer(email);
  return NextResponse.redirect(new URL('/?signedin=email', url));
}

/** Finds or creates the player row for the given email and sets the session cookie. */
async function resolvePlayer(email: string) {
  let player = await prisma.player.findUnique({ where: { loginEmail: email } });
  if (!player) {
    const current = await findSessionPlayer();
    player =
      current && !current.loginEmail
        ? await prisma.player.update({
            where: { id: current.id },
            data: { loginEmail: email, email: current.email || email },
          })
        : await prisma.player.create({ data: { loginEmail: email, email } });
  }
  await setSessionPlayer(player.id);
  return player;
}
