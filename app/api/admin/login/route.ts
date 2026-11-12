import { NextResponse } from 'next/server';
import { isAdminLoginConfigured, setAdminSession, verifyAdminCredentials } from '@/lib/server/admin-auth';

export async function POST(request: Request) {
  if (!isAdminLoginConfigured()) {
    return NextResponse.json(
      { error: 'Admin login is not configured. Set XURRI_ADMIN_EMAIL and a 16+ character XURRI_ADMIN_PASSWORD.' },
      { status: 503 },
    );
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid login request' }, { status: 400 });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Invalid login request' }, { status: 400 });
  }
  const body = parsed as { email?: unknown; password?: unknown };

  if (
    typeof body.email !== 'string' ||
    body.email.length > 254 ||
    typeof body.password !== 'string' ||
    body.password.length > 1024
  ) {
    return NextResponse.json({ error: 'Invalid login request' }, { status: 400 });
  }

  if (!verifyAdminCredentials(body.email, body.password)) {
    return NextResponse.json({ error: 'Email or password is incorrect' }, { status: 401 });
  }

  await setAdminSession();
  return NextResponse.json({ authenticated: true });
}
