import { describe, expect, it } from 'vitest';

import { weeklyReport } from './report';

const week = { weekStart: '2026-10-05', minutes: 85, activities: 6, cards: 12, quizzes: 1, effortDays: 4 };

describe('weeklyReport', () => {
  it('ne liste que ce qui a été fait et félicite la régularité', () => {
    const report = weeklyReport({ alias: 'Petit Lion', week, subjects: ['Éveil', 'Français'], badges: [] });
    expect(report.highlights).toEqual([
      '4 jours de travail',
      '85 minutes au total',
      '6 activités terminées',
      '12 cartes revues',
      '1 quiz fait',
      'Matières travaillées : Éveil, Français',
    ]);
    expect(report.childMessage).toContain('4 jours');
    expect(report.shareText.split('\n')[0]).toBe('Semaine de Petit Lion sur Côte à Côte');
  });

  it('semaine sans activité : un encouragement, jamais un reproche', () => {
    const report = weeklyReport({
      alias: 'Koala',
      week: { ...week, minutes: 0, activities: 0, cards: 0, quizzes: 0, effortDays: 0 },
      subjects: [],
      badges: [],
    });
    expect(report.highlights).toEqual([]);
    expect(report.childMessage).toMatch(/on s'y met ensemble/);
    expect(report.childMessage).not.toMatch(/\b(rien|aucun|dommage|manqu)/i);
  });

  it('maternelle : activités faites ensemble', () => {
    const report = weeklyReport({
      alias: 'Poussin',
      week: { ...week, activities: 1, effortDays: 1, cards: 0, quizzes: 0 },
      subjects: [],
      badges: [],
      kindergarten: true,
    });
    expect(report.highlights).toContain('1 activité faite ensemble');
  });
});
