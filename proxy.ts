import { NextResponse, type NextRequest } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';

const MINUTE = 60_000;

// Per IP, per minute. Sign-in and game starts are the routes worth flooding, so they get less room.
const limiters = [
  { prefix: '/api/auth', check: createRateLimiter({ limit: 20, windowMs: MINUTE }) },
  { prefix: '/api/game', check: createRateLimiter({ limit: 40, windowMs: MINUTE }) },
  { prefix: '/api/admin', check: createRateLimiter({ limit: 30, windowMs: MINUTE }) },
  { prefix: '/api', check: createRateLimiter({ limit: 120, windowMs: MINUTE }) },
];

function clientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/cron') || pathname === '/api/health') return NextResponse.next();

  const limiter = limiters.find(({ prefix }) => pathname.startsWith(prefix));
  if (!limiter) return NextResponse.next();

  const { ok, retryAfterMs } = limiter.check(`${limiter.prefix}|${clientIp(request)}`);
  if (ok) return NextResponse.next();
  return NextResponse.json(
    { error: 'Too many requests. Wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
  );
}

export const config = {
  matcher: '/api/:path*',
};
