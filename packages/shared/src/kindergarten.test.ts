import { describe, expect, it } from 'vitest';

import {
  alternativeKindergartenActivity,
  KINDERGARTEN_ACTIVITIES,
  kindergartenActivitiesFor,
  suggestKindergartenWeek,
} from './kindergarten';

const base = { childId: 'enfant-1', weekStart: '2026-10-05', theme: null, done: [] };

describe('banque d’activités de maternelle', () => {
  it('a des codes uniques, au plus trois étapes et un attendu de maternelle', () => {
    const codes = KINDERGARTEN_ACTIVITIES.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const a of KINDERGARTEN_ACTIVITIES) {
      expect(a.steps.length).toBeGreaterThan(0);
      expect(a.steps.length).toBeLessThanOrEqual(3);
      expect(a.curriculumCode).toMatch(/^MAT-(M1-M2|M3)-\d+-\d+$/);
      // Un attendu de fin de M2 n'est proposé qu'à partir des années correspondantes.
      if (a.curriculumCode.startsWith('MAT-M3')) expect(a.grades).toEqual(['M3']);
    }
  });

  it('propose plus d’activités en M3 qu’en M1', () => {
    expect(kindergartenActivitiesFor('M3').length).toBeGreaterThan(kindergartenActivitiesFor('M1').length);
  });
});

describe('activités de la semaine', () => {
  it('une activité par domaine, toujours la même pour un enfant et une semaine', () => {
    const week = suggestKindergartenWeek({ ...base, grade: 'M3' });
    expect(week.map((a) => a.domain)).toEqual(['langage', 'nombres', 'monde', 'corps']);
    expect(suggestKindergartenWeek({ ...base, grade: 'M3' })).toEqual(week);
  });

  it('change d’une semaine à l’autre ou d’un enfant à l’autre', () => {
    const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map((weekStart) =>
      suggestKindergartenWeek({ ...base, grade: 'M3', weekStart })
        .map((a) => a.code)
        .join(),
    );
    expect(new Set(weeks).size).toBeGreaterThan(1);
  });

  it('préfère les activités liées au thème de la classe', () => {
    const week = suggestKindergartenWeek({ ...base, grade: 'M3', theme: 'L’automne' });
    expect(week.find((a) => a.domain === 'monde')!.code).toBe('arbre-rue');
    expect(week.find((a) => a.domain === 'nombres')!.code).toBe('plus-lourd');
  });

  it('évite une activité faite dans les trois dernières semaines', () => {
    const first = suggestKindergartenWeek({ ...base, grade: 'M1' });
    const done = first.map((a) => ({ code: a.code, date: '2026-10-06' }));
    const next = suggestKindergartenWeek({ ...base, grade: 'M1', weekStart: '2026-10-12', done });
    for (const a of next) expect(first.map((f) => f.code)).not.toContain(a.code);
  });

  it('propose une autre activité du même domaine', () => {
    const other = alternativeKindergartenActivity('M3', 'arbre-rue', ['arbre-rue']);
    expect(other?.domain).toBe('monde');
    expect(other?.code).not.toBe('arbre-rue');
  });
});

describe("centres d'intérêt en maternelle", () => {
  it('à thème de classe égal, les activités proches des centres d’intérêt passent devant', () => {
    const base = {
      childId: 'enfant-1',
      grade: 'M2' as const,
      weekStart: '2026-10-05',
      theme: null,
      done: [],
    };
    const music = suggestKindergartenWeek({ ...base, interests: ['musique'] });
    const corps = music.find((a) => a.domain === 'corps')!;
    expect(corps.themes.some((t) => ['musique', 'chansons', 'comptines', 'danse'].includes(t))).toBe(true);
    // Le thème de la classe reste prioritaire.
    const theme = suggestKindergartenWeek({ ...base, theme: 'Les fêtes', interests: ['musique'] });
    expect(theme.find((a) => a.domain === 'corps')!.themes).toContain('fete');
  });
});
