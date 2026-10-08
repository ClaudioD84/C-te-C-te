import { addDays, daysBetween, weekdayKey, type IsoDate } from './dates';
import type { Weekday } from './profile';
import type { Grade } from './school';

/**
 * Dossiers de révision (F5) : préparation d'une épreuve sur plusieurs semaines.
 * Claude propose les thèmes ; cet algorithme les transforme en tâches datées, réparties
 * et alternées entre matières (l'alternance aide à mémoriser).
 */

export const EXAM_TYPES = ['ceb', 'ce1d', 'cess', 'bilan'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const EXAM_LABELS: Record<ExamType, string> = {
  ceb: 'CEB',
  ce1d: 'CE1D',
  cess: 'CESS (épreuves externes)',
  bilan: 'Bilan ou examens de fin de période',
};

/** Matières proposées par défaut ; le parent peut les modifier. */
export const EXAM_DEFAULT_SUBJECTS: Record<ExamType, string[]> = {
  ceb: ['Français', 'Mathématiques', 'Éveil'],
  ce1d: ['Français', 'Mathématiques', 'Sciences', 'Langue moderne', 'Formation historique et géographique'],
  cess: ['Français', 'Histoire'],
  bilan: [],
};

/** Épreuves pertinentes pour une année (le bilan est toujours possible). */
export function examTypesForGrade(grade: Grade): ExamType[] {
  const types: ExamType[] = [];
  if (grade === 'P6') types.push('ceb');
  if (grade === 'S2' || grade === 'S3') types.push('ce1d');
  if (grade === 'S6' || grade === 'S7') types.push('cess');
  types.push('bilan');
  return types;
}

export interface RevisionTheme {
  subject: string;
  title: string;
  description: string;
}

export interface PlannedRevisionTask {
  subject: string;
  kind: 'lecon' | 'examen';
  description: string;
  dueDate: IsoDate;
}

/**
 * Début de la description d'une tâche d'examen blanc (F5). La fonction de préparation des fiches s'en sert pour
 * produire une épreuve d'entraînement plutôt qu'une fiche de leçon : garder la même valeur côté serveur.
 */
export const MOCK_EXAM_PREFIX = 'Examen blanc';
const MOCK_EXAM_MAX_LENGTH = 400;

/** Description d'un examen blanc : la matière et les thèmes à couvrir. */
export function mockExamDescription(subject: string, titles: readonly string[]): string {
  const base = `${MOCK_EXAM_PREFIX} de ${subject} : `;
  let list = titles.join(', ');
  if (base.length + list.length > MOCK_EXAM_MAX_LENGTH) {
    list = `${list.slice(0, MOCK_EXAM_MAX_LENGTH - base.length - 1).replace(/,[^,]*$/, '')}…`;
  }
  return base + list;
}

export function isMockExam(description: string): boolean {
  return description.startsWith(`${MOCK_EXAM_PREFIX} `);
}

/** Alterne les matières : Français, Maths, Éveil, Français, Maths… */
export function interleaveBySubject(themes: readonly RevisionTheme[]): RevisionTheme[] {
  const bySubject = new Map<string, RevisionTheme[]>();
  for (const theme of themes) bySubject.set(theme.subject, [...(bySubject.get(theme.subject) ?? []), theme]);
  const queues = [...bySubject.values()];
  const result: RevisionTheme[] = [];
  while (queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) result.push(next);
    }
  }
  return result;
}

/**
 * Répartit les thèmes sur les jours disponibles entre aujourd'hui et l'épreuve, en gardant
 * les derniers jours pour une révision générale par matière (tâche « examen » le jour de l'épreuve).
 */
export function spreadRevisionThemes(input: {
  themes: readonly RevisionTheme[];
  today: IsoDate;
  examDate: IsoDate;
  availableDays: readonly Weekday[];
}): PlannedRevisionTask[] {
  const totalDays = daysBetween(input.today, input.examDate);
  if (totalDays < 1) return [];

  const available = new Set(input.availableDays);
  // Jours de révision des thèmes : de demain jusqu'à 3 jours avant l'épreuve (au moins demain).
  const lastThemeDay = addDays(input.examDate, -Math.min(3, Math.max(1, totalDays - 1)));
  const days: IsoDate[] = [];
  for (let d = addDays(input.today, 1); d <= lastThemeDay; d = addDays(d, 1)) {
    if (available.has(weekdayKey(d))) days.push(d);
  }
  if (days.length === 0)
    days.push(lastThemeDay < addDays(input.today, 1) ? addDays(input.today, 1) : lastThemeDay);

  const ordered = interleaveBySubject(input.themes);
  const tasks: PlannedRevisionTask[] = ordered.map((theme, i) => ({
    subject: theme.subject,
    kind: 'lecon',
    description: `${theme.title} : ${theme.description}`,
    // Répartition régulière : le i-ème thème tombe à la position proportionnelle dans la période.
    dueDate:
      days[Math.min(days.length - 1, Math.floor(((i + 1) * days.length) / ordered.length) - 1)] ?? days[0]!,
  }));

  const subjects = [...new Set(input.themes.map((t) => t.subject))];

  // Examen blanc par matière, en remontant à partir de deux jours avant l'épreuve : une matière par jour
  // disponible (pas plusieurs examens blancs le même jour). Rien si l'épreuve est demain.
  const mockDays: IsoDate[] = [];
  for (
    let d = addDays(input.examDate, -2);
    d > input.today && mockDays.length < subjects.length;
    d = addDays(d, -1)
  ) {
    if (available.has(weekdayKey(d))) mockDays.push(d);
  }
  if (mockDays.length === 0 && addDays(input.examDate, -1) > input.today)
    mockDays.push(addDays(input.examDate, -1));
  if (mockDays.length > 0) {
    subjects.forEach((subject, i) => {
      const titles = input.themes.filter((t) => t.subject === subject).map((t) => t.title);
      tasks.push({
        subject,
        kind: 'examen',
        description: mockExamDescription(subject, titles),
        // Plus de matières que de jours : on recommence au premier jour.
        dueDate: mockDays[i % mockDays.length]!,
      });
    });
  }

  for (const subject of subjects) {
    tasks.push({
      subject,
      kind: 'examen',
      description: `Révision générale de ${subject}`,
      dueDate: input.examDate,
    });
  }
  return tasks;
}
