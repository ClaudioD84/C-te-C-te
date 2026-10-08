import { describe, expect, it } from 'vitest';

import { blocusChapters, blocusWeekendDates, needsStudyPack, planBlocus } from './blocus';
import { addDays } from './dates';
import { isMockExam } from './revision';

const ALL_DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'] as const;

describe('plan de blocus', () => {
  it('chapitres saisis, sinon des parties numérotées', () => {
    expect(blocusChapters(' Fractions \n\nÉquations', 'Maths')).toEqual(['Fractions', 'Équations']);
    expect(blocusChapters('', 'Latin')).toEqual(['Latin, partie 1', 'Latin, partie 2', 'Latin, partie 3']);
  });

  it('répartit avant chaque examen, le plus proche d’abord, et ajoute la veille', () => {
    // Lundi 7 décembre 2026 ; examens les mardi 15 et jeudi 17.
    const plan = planBlocus({
      today: '2026-12-07',
      availableDays: ALL_DAYS,
      exams: [
        { subject: 'Histoire', date: '2026-12-17', chapters: ['Rome', 'Grèce', 'Égypte'] },
        { subject: 'Maths', date: '2026-12-15', chapters: ['Fractions', 'Équations', 'Géométrie', 'Stats'] },
      ],
    });
    expect(plan.overloaded).toBe(0);
    const lessons = plan.tasks.filter((t) => t.kind === 'lecon');
    expect(lessons).toHaveLength(7);
    // Chaque chapitre au plus tard l'avant-veille de son examen, jamais le jour même.
    for (const t of lessons)
      expect(t.dueDate <= (t.subject === 'Maths' ? '2026-12-13' : '2026-12-15')).toBe(true);
    // Au plus 2 chapitres par jour, 1 le dimanche (13 décembre).
    const perDay = new Map<string, number>();
    for (const t of lessons) perDay.set(t.day, (perDay.get(t.day) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2);
    expect(perDay.get('2026-12-13') ?? 0).toBeLessThanOrEqual(1);
    // Les maths (examen le plus proche) commencent.
    expect(lessons[0]!.subject).toBe('Maths');
    // La veille de chaque examen : un examen blanc, posé ce jour-là (reconnu par le planning).
    const mocks = plan.tasks.filter((t) => t.kind === 'examen');
    expect(mocks.map((t) => t.dueDate)).toEqual(['2026-12-14', '2026-12-16']);
    expect(mocks.every((t) => isMockExam(t.description))).toBe(true);
    expect(mocks[0]!.description).toContain('Fractions');
  });

  it('signale un plan trop serré sans perdre de chapitre', () => {
    const plan = planBlocus({
      today: '2026-12-07',
      availableDays: ALL_DAYS,
      exams: [{ subject: 'Sciences', date: '2026-12-10', chapters: ['A', 'B', 'C', 'D', 'E', 'F'] }],
    });
    expect(plan.tasks.filter((t) => t.kind === 'lecon')).toHaveLength(6);
    expect(plan.overloaded).toBeGreaterThan(0);
  });

  it('ignore les examens passés et respecte les jours de travail', () => {
    const plan = planBlocus({
      today: '2026-12-07',
      availableDays: ['lun', 'mer'],
      exams: [
        { subject: 'Latin', date: '2026-12-01', chapters: ['X'] },
        { subject: 'Anglais', date: '2026-12-18', chapters: ['Verbes', 'Vocabulaire'] },
      ],
    });
    expect(plan.tasks.some((t) => t.subject === 'Latin')).toBe(false);
    expect(plan.tasks.filter((t) => t.kind === 'lecon').map((t) => t.day)).toEqual([
      '2026-12-09',
      '2026-12-14',
    ]);
  });

  it('fiches IA seulement pour les chapitres nommés', () => {
    const plan = planBlocus({
      today: '2026-12-07',
      availableDays: ALL_DAYS,
      exams: [
        { subject: 'Histoire', date: '2026-12-15', chapters: blocusChapters('', 'Histoire') },
        { subject: 'Maths', date: '2026-12-16', chapters: ['Fractions'] },
      ],
    });
    const packs = plan.tasks.filter(needsStudyPack).map((t) => t.description);
    expect(packs).toEqual(['Revoir : Fractions', 'Examen blanc de Maths : Fractions']);
    expect(plan.tasks.find((t) => t.subject === 'Histoire' && t.kind === 'examen')!.description).toBe(
      'Examen blanc de Histoire : toute la matière',
    );
    // Une tâche du journal de classe garde sa fiche.
    expect(needsStudyPack({ subject: 'Éveil', description: 'Les fleuves de Belgique' })).toBe(true);
    expect(needsStudyPack({ subject: 'Histoire', description: 'Revoir : Rome, partie 2' })).toBe(true);
  });

  it('week-end de blocus : samedis et dimanches jusqu’au dernier examen', () => {
    const exams = [{ exam_date: '2026-12-15', weekend_work: true }];
    // Lundi 7 décembre : le week-end des 12 et 13 décembre.
    expect(blocusWeekendDates(exams, '2026-12-07', ['lun', 'mar', 'mer', 'jeu', 'ven'])).toEqual([
      '2026-12-12',
      '2026-12-13',
    ]);
    expect(blocusWeekendDates(exams, '2026-12-07', ALL_DAYS)).toEqual([]);
    expect(
      blocusWeekendDates([{ exam_date: '2026-12-15', weekend_work: false }], '2026-12-07', ['lun']),
    ).toEqual([]);
    expect(blocusWeekendDates(exams, '2026-12-14', ['lun'])).toEqual([]);
  });
});
