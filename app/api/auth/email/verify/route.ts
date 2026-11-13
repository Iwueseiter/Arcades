import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeMagicLink } from '@/lib/server/magic-link';
import { findSessionPlayer, setSessionPlayer } from '@/lib/server/session';

/** Opened from the sign-in email. Signs the player in and sends them back to the app. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const email = token ? await consumeMagicLink(token) : null;
  if (!email) return NextResponse.redirect(new URL('/signin?link=expired', url));

  let player = await prisma.player.findUnique({ where: { loginEmail: email } });
  if (!player) {
    // First email sign-in: the current guest (or wallet) player keeps their progress and gets the email.
    const current = await findSessionPlayer();
    player =
      current && !current.loginEmail
        ? await prisma.player.update({ where: { id: current.id }, data: { loginEmail: email, email: current.email || email } })
        : await prisma.player.create({ data: { loginEmail: email, email } });
  }

  await setSessionPlayer(player.id);
  return NextResponse.redirect(new URL('/?signedin=email', url));
}
