import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  it('allows up to the limit, then blocks until the window resets', () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check('ip', 0).ok).toBe(true);
    expect(check('ip', 10).ok).toBe(true);
    expect(check('ip', 20)).toEqual({ ok: false, retryAfterMs: 980 });
    expect(check('other', 20).ok).toBe(true);
    expect(check('ip', 1000).ok).toBe(true);
  });

  it('stays bounded in memory', () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 3 });
    for (let i = 0; i < 10; i += 1) check(`ip${i}`, 0);
    expect(check('ip9', 0).ok).toBe(false);
  });
});
