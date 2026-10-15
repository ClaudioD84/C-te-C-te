import { describe, expect, it } from 'vitest';

import { ACCESSORY_CODES, isAccessory, isUnlocked } from './accessories';
import { AVATAR_STAGES } from './rewards';

describe('accessoires', () => {
  const summary = (level: number, badges: string[]) => ({
    stage: AVATAR_STAGES[level - 1]!,
    badges: badges.map((code) => ({ code, earnedOn: '2026-10-05' })) as never,
  });

  it('débloqués par le stade ou un badge, jamais au départ', () => {
    expect(ACCESSORY_CODES.filter((c) => isUnlocked(c, summary(1, [])))).toEqual([]);
    expect(isUnlocked('casquette', summary(2, []))).toBe(true);
    expect(isUnlocked('couronne', summary(4, []))).toBe(false);
    expect(isUnlocked('lunettes', summary(1, ['trois_jours_semaine']))).toBe(true);
  });

  it('codes inconnus refusés', () => {
    expect(isAccessory('casquette')).toBe(true);
    expect(isAccessory('lance-flammes')).toBe(false);
    expect(isAccessory(null)).toBe(false);
  });
});
