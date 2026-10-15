import { describe, expect, it } from 'vitest';

import { currentHoliday } from './holidays';

describe('vacances', () => {
  const daysOff = [
    { start: '2026-10-19', end: '2026-10-30', kind: 'conge' as const },
    { start: '2026-10-06', end: '2026-10-06', kind: 'absence' as const },
  ];
  it('seul un congé scolaire en cours compte', () => {
    expect(currentHoliday(daysOff, '2026-10-20')?.start).toBe('2026-10-19');
    expect(currentHoliday(daysOff, '2026-10-06')).toBeUndefined();
    expect(currentHoliday(daysOff, '2026-10-31')).toBeUndefined();
  });
});
