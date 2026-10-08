import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, formatRelativeDate, formatShortDate, toIsoDate, weekdayKey } from './dates';

describe('dates', () => {
  it('formate une date locale', () => {
    expect(toIsoDate(new Date(2026, 9, 4))).toBe('2026-10-04');
  });

  it('ajoute des jours en changeant de mois et d’heure (passage à l’heure d’hiver)', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });

  it('compte les jours entre deux dates', () => {
    expect(daysBetween('2026-10-04', '2026-10-10')).toBe(6);
    expect(daysBetween('2026-10-10', '2026-10-04')).toBe(-6);
    expect(daysBetween('2026-10-20', '2026-10-27')).toBe(7);
  });

  it('donne le jour de la semaine', () => {
    expect(weekdayKey('2026-10-04')).toBe('dim');
    expect(weekdayKey('2026-10-05')).toBe('lun');
  });

  it('affiche des dates lisibles', () => {
    expect(formatShortDate('2026-10-06')).toBe('mar. 6 oct.');
    expect(formatRelativeDate('2026-10-04', '2026-10-04')).toBe("aujourd'hui");
    expect(formatRelativeDate('2026-10-05', '2026-10-04')).toBe('demain');
    expect(formatRelativeDate('2026-10-08', '2026-10-04')).toBe('jeudi 8 oct.');
  });
});
