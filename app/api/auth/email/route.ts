import { NextResponse } from 'next/server';
import { isEmail, normalizeEmail, sendMagicLink } from '@/lib/server/magic-link';

/** Emails a sign-in link. The answer is the same whether or not the address has an account. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  if (!isEmail(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });

  try {
    const sent = await sendMagicLink(email, request);
    if (!sent) return NextResponse.json({ error: 'We just sent you a link. Check your inbox, or try again in a few minutes.' }, { status: 429 });
  } catch (error) {
    console.error('[auth] magic link failed', error);
    return NextResponse.json({ error: 'We couldn’t send the email right now. Please try again soon.' }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
