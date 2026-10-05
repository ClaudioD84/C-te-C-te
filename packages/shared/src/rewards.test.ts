import { describe, expect, it } from 'vitest';

import { addDays } from './dates';
import { computeRewards, weeklyEffort, type EffortDay } from './rewards';

const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven'] as const;
const day = (date: string, patch: Partial<EffortDay> = {}): EffortDay => ({
  date,
  activities: 1,
  cards: 0,
  quizzes: 0,
  sessions: 0,
  recovered: 0,
  ...patch,
});
// Lundi 5 octobre 2026.
const MON = '2026-10-05';
const weekdaysFrom = (start: string, count: number) => {
  const result: string[] = [];
  for (let d = start; result.length < count; d = addDays(d, 1)) {
    if (!['2026-10-10', '2026-10-11', '2026-10-17', '2026-10-18'].includes(d)) result.push(d);
  }
  return result;
};

describe('récompenses', () => {
  it('part de la graine sans effort', () => {
    const r = computeRewards([], WEEKDAYS, MON);
    expect(r).toMatchObject({ points: 0, badges: [], currentStreak: 0 });
    expect(r.stage.name).toBe('Graine');
  });

  it('donne le premier badge et des points à la première activité', () => {
    const r = computeRewards([day(MON)], WEEKDAYS, MON);
    expect(r.points).toBe(10);
    expect(r.badges.map((b) => b.code)).toEqual(['premiere_mission']);
  });

  it('récompense la régularité dans la semaine', () => {
    const r = computeRewards(
      weekdaysFrom(MON, 5).map((d) => day(d)),
      WEEKDAYS,
      '2026-10-09',
    );
    const codes = r.badges.map((b) => b.code);
    expect(codes).toContain('trois_jours_semaine');
    expect(codes).toContain('cinq_jours_semaine');
    expect(r.effortDaysThisWeek).toBe(5);
  });

  it('ne casse pas la série pendant le week-end non prévu', () => {
    const days = weekdaysFrom(MON, 7).map((d) => day(d));
    const r = computeRewards(days, WEEKDAYS, '2026-10-13');
    expect(r.currentStreak).toBe(7);
    expect(r.badges.map((b) => b.code)).toContain('serie_7');
  });

  it('garde les badges acquis quand la série s’arrête', () => {
    const days = weekdaysFrom(MON, 7).map((d) => day(d));
    const r = computeRewards(days, WEEKDAYS, '2026-10-16');
    expect(r.currentStreak).toBe(0);
    expect(r.badges.map((b) => b.code)).toContain('serie_7');
  });

  it('valorise le retour après une pause', () => {
    const r = computeRewards([day(MON), day('2026-10-12')], WEEKDAYS, '2026-10-12');
    expect(r.badges.map((b) => b.code)).toContain('de_retour');
  });

  it('récompense la persévérance et fait grandir l’avatar', () => {
    const r = computeRewards([day(MON, { cards: 60, recovered: 5, activities: 0 })], WEEKDAYS, MON);
    expect(r.badges.map((b) => b.code)).toEqual(expect.arrayContaining(['cartes_50', 'perseverance']));
    expect(r.points).toBe(75);
    expect(r.stage.name).toBe('Pousse');
    expect(r.progress).toBeCloseTo(25 / 150);
  });
});

describe('effort par semaine', () => {
  it('regroupe par semaine du lundi au dimanche, la plus récente en dernier', () => {
    const weeks = weeklyEffort(
      [
        { ...day('2026-09-28'), minutes: 20 },
        { ...day('2026-10-04', { cards: 5 }), minutes: 10 },
        { ...day('2026-10-05'), minutes: 15 },
      ],
      '2026-10-07',
      3,
    );
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-09-21', '2026-09-28', '2026-10-05']);
    expect(weeks.map((w) => w.minutes)).toEqual([0, 30, 15]);
    expect(weeks[1]).toMatchObject({ activities: 2, cards: 5, effortDays: 2 });
  });
});
