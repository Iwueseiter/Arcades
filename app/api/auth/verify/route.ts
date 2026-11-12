import { NextResponse } from 'next/server';
import { createPublicClient, getAddress, http, isAddress, isHex } from 'viem';
import { chainConfig } from '@/lib/chain/config';
import { prisma } from '@/lib/prisma';
import { toSnapshot } from '@/lib/server/player';
import { consumeNonce, getSessionPlayer, setSessionPlayer, signInMessage } from '@/lib/server/session';

const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { address?: string; signature?: string };
  if (!body.address || !isAddress(body.address) || !body.signature || !isHex(body.signature)) {
    return NextResponse.json({ error: 'Invalid sign-in request' }, { status: 400 });
  }

  const pending = await consumeNonce();
  if (!pending) return NextResponse.json({ error: 'Sign-in expired, try again' }, { status: 401 });

  const address = getAddress(body.address);
  // publicClient.verifyMessage also accepts smart-contract wallets (ERC-1271 / ERC-6492).
  const valid = await publicClient
    .verifyMessage({ address, message: signInMessage(address, pending.nonce, pending.issuedAt), signature: body.signature })
    .catch(() => false);
  if (!valid) return NextResponse.json({ error: 'Signature did not match this wallet' }, { status: 401 });

  const key = address.toLowerCase();
  const existing = await prisma.player.findUnique({ where: { address: key } });
  let player;
  if (existing) {
    player = existing;
  } else {
    // First sign-in: the guest's progress moves to the wallet.
    const guest = await getSessionPlayer();
    player = guest.address
      ? await prisma.player.create({ data: { address: key } })
      : await prisma.player.update({ where: { id: guest.id }, data: { address: key } });
  }

  await setSessionPlayer(player.id);
  return NextResponse.json(toSnapshot(player));
}
