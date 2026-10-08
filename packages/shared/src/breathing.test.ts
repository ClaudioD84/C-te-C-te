import { describe, expect, it } from 'vitest';

import { breathingAt } from './breathing';

describe('pause respiration', () => {
  it('inspire 4 s, souffle 6 s, 5 fois', () => {
    expect(breathingAt(0)).toEqual({ phase: 'inspire', cycle: 1, fullness: 0 });
    expect(breathingAt(2000)).toEqual({ phase: 'inspire', cycle: 1, fullness: 0.5 });
    expect(breathingAt(4000)).toEqual({ phase: 'souffle', cycle: 1, fullness: 1 });
    expect(breathingAt(7000)).toEqual({ phase: 'souffle', cycle: 1, fullness: 0.5 });
    expect(breathingAt(10_000).cycle).toBe(2);
    expect(breathingAt(50_000).phase).toBe('fini');
  });
});
