import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { issueNonce, signInMessage } from '@/lib/server/session';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { address?: string };
  if (!body.address || !isAddress(body.address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }
  const { nonce, issuedAt } = await issueNonce();
  return NextResponse.json({ message: signInMessage(getAddress(body.address), nonce, issuedAt) });
}
