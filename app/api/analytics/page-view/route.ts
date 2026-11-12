import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VISITOR_COOKIE = 'xurri_analytics_visitor';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 180;
const ALLOWED_PATHS = new Set(['/', '/claim', '/signup', '/signin', '/me']);

export async function POST(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid page-view request' }, { status: 400 });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Invalid page-view request' }, { status: 400 });
  }
  const body = parsed as { path?: unknown };

  if (typeof body.path !== 'string' || body.path.length > 100) {
    return NextResponse.json({ error: 'Invalid page path' }, { status: 400 });
  }

  const tabPath = /^\/\?tab=(play|ranks|shop|rewards|me)$/.test(body.path);
  if (!tabPath && !ALLOWED_PATHS.has(body.path)) {
    return NextResponse.json({ error: 'Unsupported page path' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const storedVisitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  const visitorId = storedVisitorId && /^[a-f\d-]{36}$/i.test(storedVisitorId) ? storedVisitorId : randomUUID();
  const pagePath = body.path;
  const recentView = await prisma.analyticsPageView.findFirst({
    where: {
      visitorId,
      pagePath,
      createdAt: { gte: new Date(Date.now() - 30_000) },
    },
    select: { id: true },
  });

  if (!recentView) await prisma.analyticsPageView.create({ data: { visitorId, pagePath } });

  const response = NextResponse.json({ tracked: true }, { headers: { 'Cache-Control': 'no-store' } });
  if (visitorId !== storedVisitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: VISITOR_MAX_AGE,
    });
  }
  return response;
}
