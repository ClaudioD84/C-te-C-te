import { describe, expect, it } from 'vitest';

import { weekdayKey } from './dates';
import {
  examTypesForGrade,
  interleaveBySubject,
  isMockExam,
  mockExamDescription,
  spreadRevisionThemes,
  type RevisionTheme,
} from './revision';

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
    expect(
      tasks.filter((t) => t.kind === 'examen' && !isMockExam(t.description)).map((t) => t.dueDate),
    ).toEqual(['2026-06-15', '2026-06-15']);
    // Un examen blanc par matière, un par jour disponible en remontant depuis J-2 (samedi 13 → vendredi 12, jeudi 11).
    const mocks = tasks.filter((t) => isMockExam(t.description));
    expect(mocks.map((t) => [t.subject, t.dueDate])).toEqual([
      ['Français', '2026-06-12'],
      ['Mathématiques', '2026-06-11'],
    ]);
    expect(mocks[0]!.description).toBe(
      'Examen blanc de Français : Français 1, Français 2, Français 3, Français 4, Français 5, Français 6',
    );
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

  it('place l’examen blanc la veille si l’épreuve est proche, et l’omet si elle est demain', () => {
    const soon = spreadRevisionThemes({
      themes: [theme('Fr', 1)],
      today: '2026-06-12',
      examDate: '2026-06-15',
      availableDays: WEEKDAYS,
    });
    expect(soon.filter((t) => isMockExam(t.description)).map((t) => t.dueDate)).toEqual(['2026-06-14']);
    const tomorrow = spreadRevisionThemes({
      themes: [theme('Fr', 1)],
      today: '2026-06-14',
      examDate: '2026-06-15',
      availableDays: WEEKDAYS,
    });
    expect(tomorrow.some((t) => isMockExam(t.description))).toBe(false);
  });

  it('limite la longueur de la description d’un examen blanc', () => {
    const description = mockExamDescription(
      'Éveil',
      Array.from({ length: 60 }, (_, i) => `Thème numéro ${i}`),
    );
    expect(description.length).toBeLessThanOrEqual(400);
    expect(description.endsWith('…')).toBe(true);
    expect(isMockExam(description)).toBe(true);
    expect(isMockExam('Examen de Mathématiques')).toBe(false);
  });
});
