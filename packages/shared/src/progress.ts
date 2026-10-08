import { addDays, daysBetween, type IsoDate } from './dates';
import type { EffortDay } from './rewards';

/**
 * Cockpit parent avancé (F7, étape 3) : comparaison avec la semaine précédente et progression par matière.
 * Toujours présenté comme un repère pour le parent, jamais comme un classement.
 */

export type ProgressKey = 'minutes' | 'effortDays' | 'activities' | 'cards' | 'quizzes';

export const PROGRESS_LABELS: Record<ProgressKey, string> = {
  minutes: 'Minutes de travail',
  effortDays: 'Jours actifs',
  activities: 'Activités faites',
  cards: 'Cartes revues',
  quizzes: 'Quiz faits',
};

export interface Comparison {
  key: ProgressKey;
  label: string;
  current: number;
  previous: number;
  delta: number;
}

type Day = EffortDay & { minutes?: number };

function totals(days: readonly Day[], from: IsoDate, to: IsoDate): Record<ProgressKey, number> {
  const inRange = days.filter((d) => d.date >= from && d.date <= to);
  const sum = (pick: (d: Day) => number) => inRange.reduce((total, d) => total + pick(d), 0);
  return {
    minutes: sum((d) => d.minutes ?? 0),
    effortDays: inRange.filter((d) => d.activities + d.cards + d.quizzes + d.sessions > 0).length,
    activities: sum((d) => d.activities),
    cards: sum((d) => d.cards),
    quizzes: sum((d) => d.quizzes),
  };
}

/** Lundi de la semaine d'une date. */
export function mondayOfWeek(date: IsoDate): IsoDate {
  const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7; // lundi = 0
  return addDays(date, -weekday);
}

/**
 * Cette semaine (du lundi à aujourd'hui) comparée à la semaine précédente sur les mêmes jours :
 * un mercredi, on compare lundi-mercredi aux lundi-mercredi précédents, pas à une semaine entière.
 */
export function compareWithLastWeek(days: readonly Day[], today: IsoDate): Comparison[] {
  const monday = mondayOfWeek(today);
  const elapsed = daysBetween(monday, today);
  const current = totals(days, monday, today);
  const previousMonday = addDays(monday, -7);
  const previous = totals(days, previousMonday, addDays(previousMonday, elapsed));
  return (Object.keys(PROGRESS_LABELS) as ProgressKey[]).map((key) => ({
    key,
    label: PROGRESS_LABELS[key],
    current: current[key],
    previous: previous[key],
    delta: current[key] - previous[key],
  }));
}

/** Formulation neutre d'un écart, pour l'affichage et les lecteurs d'écran. */
export function describeDelta(delta: number): string {
  if (delta === 0) return 'autant que la semaine dernière';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} par rapport à la semaine dernière`;
}

/** Statistiques par matière (fonction SQL child_subject_stats). */
export interface SubjectStats {
  subject: string;
  minutes: number;
  activities: number;
  cards: number;
  quizzes: number;
  quizScore: number;
  quizTotal: number;
}

export interface SubjectProgress extends SubjectStats {
  /** Part de bonnes réponses aux quiz (0 à 100), ou null sans quiz. */
  quizRate: number | null;
}

/** Matières triées par temps de travail ; taux de réussite aux quiz arrondi. */
export function subjectProgress(rows: readonly SubjectStats[]): SubjectProgress[] {
  return rows
    .map((row) => ({
      ...row,
      quizRate: row.quizTotal > 0 ? Math.round((row.quizScore / row.quizTotal) * 100) : null,
    }))
    .sort(
      (a, b) =>
        b.minutes - a.minutes ||
        b.activities + b.cards - (a.activities + a.cards) ||
        a.subject.localeCompare(b.subject),
    );
}
