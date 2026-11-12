import { describe, expect, it } from 'vitest';
import { botSignal, getWeekKey, replayRound, weekIndexFor, type TapLogEntry } from '@/lib/game-rules';

const taps = (times: number[], kind: TapLogEntry['kind'] = 'standard') => times.map((t) => ({ t, kind }));

describe('replayRound', () => {
  it('scores a normal round', () => {
    const result = replayRound(taps([500, 1000, 1500]), 2000);
    expect(result).toMatchObject({ ok: true, score: 30, hits: 3 });
  });

  it('rejects events out of order', () => {
    expect(replayRound(taps([1000, 500]), 2000)).toMatchObject({ ok: false });
  });

  it('rejects more events than could have spawned', () => {
    const log = taps(Array.from({ length: 200 }, (_, i) => i * 5));
    expect(replayRound(log, 1000)).toMatchObject({ ok: false, reason: 'Too many events for round length' });
  });

  it('rejects taps after the last life is gone', () => {
    const log = [...taps([100, 200, 300], 'miss'), ...taps([400])];
    expect(replayRound(log, 1000)).toMatchObject({ ok: false, reason: 'Events after game over' });
  });
});

describe('botSignal', () => {
  // A person: gaps that wander between ~150ms and ~650ms, with the odd quick double tap.
  const human = () => {
    let t = 0;
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return taps(
      Array.from({ length: 120 }, (_, i) => {
        t += i % 9 === 0 ? 60 + rand() * 40 : 150 + rand() * 500;
        return Math.round(t);
      }),
    );
  };

  it('lets human-looking play through', () => {
    expect(botSignal(human())).toBeNull();
  });

  it('ignores short rounds', () => {
    expect(botSignal(taps([10, 20, 30, 40]))).toBeNull();
  });

  it('flags metronome timing', () => {
    expect(botSignal(taps(Array.from({ length: 100 }, (_, i) => i * 300)))).toBe('perfectly even timing');
  });

  it('flags mostly instant taps', () => {
    expect(botSignal(taps(Array.from({ length: 100 }, (_, i) => i * 40 + (i % 3) * 7)))).toBe('too many instant taps');
  });
});

describe('getWeekKey', () => {
  it('uses ISO weeks', () => {
    expect(getWeekKey(new Date('2026-11-12T12:00:00Z'))).toBe('2026-W46');
    expect(getWeekKey(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
  });
});

describe('weekIndexFor', () => {
  // Same numbers as XurriTournaments.currentWeek() in contracts/test/Xurri.t.sol.
  it('matches the contract week for the ISO week', () => {
    expect(weekIndexFor('2026-W46')).toBe(2967);
    expect(weekIndexFor('2026-W47')).toBe(2968);
    expect(weekIndexFor(getWeekKey(new Date('2026-11-16T00:00:00Z')))).toBe(2968);
    expect(weekIndexFor(getWeekKey(new Date('2026-11-15T23:59:59Z')))).toBe(2967);
  });

  it('handles ISO years that start in December', () => {
    // 2026-W53 runs Mon 28 Dec 2026 to Sun 3 Jan 2027.
    const monday = Date.UTC(2026, 11, 28) / 1000;
    expect(weekIndexFor('2026-W53')).toBe(Math.floor((monday + 3 * 86400) / (7 * 86400)));
  });
});
