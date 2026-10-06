import { describe, expect, it } from 'vitest';

import { deriveLearningSettings } from './learning-settings';
import {
  adaptationLines,
  buildProReportHtml,
  DEFAULT_PRO_REPORT_SECTIONS,
  effortSummary,
  proReportStart,
} from './pro-report';

describe('bilan pour un professionnel', () => {
  it('résume l’effort de la période', () => {
    const summary = effortSummary(
      [
        { date: '2026-09-01', activities: 2, cards: 5, quizzes: 1, minutes: 30 },
        { date: '2026-09-02', activities: 0, cards: 0, quizzes: 0, minutes: 0 },
        { date: '2026-09-09', activities: 1, cards: 0, quizzes: 0, minutes: 15 },
        { date: '2026-12-01', activities: 9, cards: 0, quizzes: 0, minutes: 99 },
      ],
      '2026-09-01',
      '2026-09-14',
    );
    expect(summary).toEqual({ days: 2, minutes: 45, activities: 3, cards: 5, quizzes: 1, daysPerWeek: 1 });
  });

  it('période : 3 mois ou depuis la rentrée', () => {
    expect(proReportStart('2026-12-01', 'trimestre')).toBe('2026-09-01');
    expect(proReportStart('2026-10-06', 'annee')).toBe('2026-08-25');
    expect(proReportStart('2027-03-01', 'annee')).toBe('2026-08-25');
  });

  it('ne contient que les parties cochées ; besoins jamais d’office ; texte échappé', () => {
    expect(DEFAULT_PRO_REPORT_SECTIONS).not.toContain('besoins');
    const base = {
      alias: 'Loutre',
      gradeLabel: '3e primaire',
      from: '2026-09-01',
      to: '2026-11-30',
      effort: { days: 30, minutes: 600, activities: 40, cards: 100, quizzes: 12, daysPerWeek: 2.3 },
      help: [{ subject: 'Mathématiques', count: 3 }],
      needs: ['Dyslexie'],
      comment: 'Fatigué <le soir>',
    };
    const html = buildProReportHtml({ ...base, sections: DEFAULT_PRO_REPORT_SECTIONS });
    expect(html).toContain('Bilan du travail à la maison : Loutre');
    expect(html).toContain('30 jours de travail à la maison (2.3 par semaine en moyenne)');
    expect(html).toContain('Mathématiques : 3 demandes');
    expect(html).not.toContain('Dyslexie');
    expect(html).toContain('Fatigué &lt;le soir&gt;');
    expect(buildProReportHtml({ ...base, sections: ['besoins'] })).toContain('Dyslexie');
    expect(buildProReportHtml({ ...base, sections: ['besoins'] })).not.toContain('jours de travail');
  });

  it('décrit les adaptations de l’application', () => {
    const lines = adaptationLines(
      deriveLearningSettings({
        grade: 'P3',
        needs: ['dyslexie'],
        preferences: { availableDays: ['lun'], prefersPaper: false },
      } as never),
    );
    expect(lines[0]).toMatch(/^Séances de \d+ minutes/);
    expect(lines).toContain('Police adaptée à la lecture, lettres et lignes espacées');
  });
});
