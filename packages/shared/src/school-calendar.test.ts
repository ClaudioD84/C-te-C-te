import { describe, expect, it } from 'vitest';

import { currentSchoolYear, FWB_SCHOOL_YEARS, upcomingBreaks } from './school-calendar';

describe('calendrier scolaire FWB', () => {
  it('congés dans l’année, dans l’ordre, de deux semaines (lundi → vendredi) pour les vacances', () => {
    for (const year of Object.values(FWB_SCHOOL_YEARS)) {
      let previous = year.start;
      for (const b of year.breaks) {
        expect(b.start >= previous && b.end >= b.start && b.end <= year.end).toBe(true);
        previous = b.end;
        if (b.start !== b.end) {
          expect(new Date(`${b.start}T12:00:00Z`).getUTCDay()).toBe(1);
          expect(new Date(`${b.end}T12:00:00Z`).getUTCDay()).toBe(5);
          const days = (Date.parse(b.end) - Date.parse(b.start)) / 86_400_000;
          expect(days).toBe(11);
        }
      }
    }
  });

  it('congés à venir selon la date', () => {
    expect(currentSchoolYear('2026-10-06')?.name).toBe('2026-2027');
    expect(upcomingBreaks('2026-10-06')[0]!.label).toBe('Congé d’automne');
    expect(upcomingBreaks('2027-05-20')).toEqual([]);
    expect(currentSchoolYear('2027-08-01')).toBeUndefined();
  });
});
