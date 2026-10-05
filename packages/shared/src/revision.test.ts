import { describe, expect, it } from 'vitest';

import { weekdayKey } from './dates';
import { examTypesForGrade, interleaveBySubject, spreadRevisionThemes, type RevisionTheme } from './revision';

const theme = (subject: string, n: number): RevisionTheme => ({
  subject,
  title: `${subject} ${n}`,
  description: 'Revoir',
});
const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven'] as const;

describe('dossiers de révision', () => {
  it('propose les épreuves selon l’année', () => {
    expect(examTypesForGrade('P6')).toEqual(['ceb', 'bilan']);
    expect(examTypesForGrade('S2')).toEqual(['ce1d', 'bilan']);
    expect(examTypesForGrade('P3')).toEqual(['bilan']);
  });

  it('alterne les matières', () => {
    const order = interleaveBySubject([
      theme('Fr', 1),
      theme('Fr', 2),
      theme('Ma', 1),
      theme('Ma', 2),
      theme('Év', 1),
    ]);
    expect(order.map((t) => t.title)).toEqual(['Fr 1', 'Ma 1', 'Év 1', 'Fr 2', 'Ma 2']);
  });

  it('étale les thèmes sur les jours disponibles avant l’épreuve et termine par une révision générale', () => {
    const themes = [1, 2, 3, 4, 5, 6].flatMap((n) => [theme('Français', n), theme('Mathématiques', n)]);
    const tasks = spreadRevisionThemes({
      themes,
      today: '2026-05-04',
      examDate: '2026-06-15',
      availableDays: WEEKDAYS,
    });
    const lessons = tasks.filter((t) => t.kind === 'lecon');
    expect(lessons).toHaveLength(12);
    for (const t of lessons) {
      expect(['sam', 'dim']).not.toContain(weekdayKey(t.dueDate));
      expect(t.dueDate > '2026-05-04').toBe(true);
      expect(t.dueDate <= '2026-06-12').toBe(true);
    }
    // Répartition : la première et la dernière date sont éloignées.
    const dates = lessons.map((t) => t.dueDate).sort();
    expect(dates[0]! < '2026-05-12').toBe(true);
    expect(dates.at(-1)! > '2026-06-05').toBe(true);
    expect(tasks.filter((t) => t.kind === 'examen').map((t) => t.dueDate)).toEqual([
      '2026-06-15',
      '2026-06-15',
    ]);
  });

  it('gère une épreuve très proche', () => {
    const tasks = spreadRevisionThemes({
      themes: [theme('Fr', 1)],
      today: '2026-06-12',
      examDate: '2026-06-15',
      availableDays: WEEKDAYS,
    });
    expect(tasks.find((t) => t.kind === 'lecon')!.dueDate >= '2026-06-13').toBe(true);
    expect(
      spreadRevisionThemes({
        themes: [theme('Fr', 1)],
        today: '2026-06-15',
        examDate: '2026-06-15',
        availableDays: WEEKDAYS,
      }),
    ).toEqual([]);
  });
});
