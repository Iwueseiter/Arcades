import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { consumeMagicLink } from '@/lib/server/magic-link';
import { getMagicAdmin } from '@/lib/server/magic-admin';
import { findSessionPlayer, setSessionPlayer } from '@/lib/server/session';
import { toSnapshot } from '@/lib/server/player';

/**
 * Verifies a Magic DIDToken, signs the player in, and saves their
 * Magic-created wallet address so they can play immediately.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { didToken?: unknown };
    const didToken = typeof body.didToken === 'string' ? body.didToken : null;

    if (!didToken) {
      return NextResponse.json({ error: 'DID token is required.' }, { status: 400 });
    }

    if (!process.env.MAGIC_SECRET_KEY) {
      console.error('[auth] MAGIC_SECRET_KEY is not set.');
      return NextResponse.json({ error: 'Auth is not configured on the server.' }, { status: 500 });
    }

    let email: string;
    let walletAddress: string | null = null;

    try {
      const metadata = await getMagicAdmin().users.getMetadataByToken(didToken);
      if (!metadata.email) throw new Error('No email returned from Magic.');
      email = metadata.email.trim().toLowerCase();
      // Magic creates a non-custodial wallet for every email user.
      if (metadata.publicAddress && isAddress(metadata.publicAddress)) {
        walletAddress = getAddress(metadata.publicAddress).toLowerCase();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[auth] magic token verification failed:', msg);
      return NextResponse.json(
        { error: `Sign-in failed. The code may have expired — please try again.` },
        { status: 401 },
      );
    }

    const player = await resolvePlayer(email, walletAddress);
    return NextResponse.json(toSnapshot(player));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[auth] unexpected error in POST /api/auth/email/verify:', msg);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}

/** Opened from the sign-in email link (backward-compat). Signs the player in and redirects. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const email = token ? await consumeMagicLink(token) : null;
  if (!email) return NextResponse.redirect(new URL('/signin?link=expired', url));
  await resolvePlayer(email, null);
  return NextResponse.redirect(new URL('/?signedin=email', url));
}

/**
 * Finds or creates the player row for the given email.
 * Also persists the Magic wallet address if one was provided and not already set.
 */
async function resolvePlayer(email: string, walletAddress: string | null) {
  // First try to find by loginEmail
  let player = await prisma.player.findUnique({ where: { loginEmail: email } });

  if (!player) {
    const current = await findSessionPlayer();
    if (current && !current.loginEmail) {
      // Attach email (and wallet) to the existing guest/wallet session
      player = await prisma.player.update({
        where: { id: current.id },
        data: {
          loginEmail: email,
          email: current.email || email,
          // Only set address if the player doesn't already have one
          ...(walletAddress && !current.address ? { address: walletAddress } : {}),
        },
      });
    } else {
      // Brand new player — create with email + Magic wallet
      player = await prisma.player.create({
        data: {
          loginEmail: email,
          email,
          ...(walletAddress ? { address: walletAddress } : {}),
        },
      });
    }
  } else if (walletAddress && !player.address) {
    // Existing email player without a wallet address — backfill it
    player = await prisma.player.update({
      where: { id: player.id },
      data: { address: walletAddress },
    });
  }

  await setSessionPlayer(player.id);
  return player;
}
