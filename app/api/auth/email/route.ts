import { NextResponse } from 'next/server';

/**
 * Email OTP is now handled entirely by the Magic SDK on the client.
 * This endpoint is kept as a stub so older clients don't receive a 404.
 * The real auth exchange happens at POST /api/auth/email/verify (DIDToken).
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
