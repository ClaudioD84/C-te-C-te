import { addDays, daysBetween, weekdayKey, type IsoDate } from './dates';
import type { Weekday } from './profile';

/**
 * Gamification éthique (F11) : on valorise l'effort, la régularité et la persévérance,
 * jamais le résultat brut. Rien ne se perd : pas de série qui retombe à zéro, pas de classement.
 */

/** Effort d'une journée, agrégé côté serveur (fonction SQL child_effort_days). */
export interface EffortDay {
  date: IsoDate;
  activities: number;
  cards: number;
  quizzes: number;
  sessions: number;
  /** Cartes oubliées une fois puis réussies plus tard : la persévérance. */
  recovered: number;
}

export const POINTS = { activity: 10, card: 1, quiz: 5, session: 10, recovered: 3 } as const;

export function dayPoints(day: EffortDay): number {
  return (
    day.activities * POINTS.activity +
    day.cards * POINTS.card +
    day.quizzes * POINTS.quiz +
    day.sessions * POINTS.session +
    day.recovered * POINTS.recovered
  );
}

export interface AvatarStage {
  level: number;
  name: string;
  emoji: string;
  /** Points nécessaires pour atteindre ce stade. */
  threshold: number;
}

/** L'avatar grandit avec l'effort : il ne régresse jamais. */
export const AVATAR_STAGES: readonly AvatarStage[] = [
  { level: 1, name: 'Graine', emoji: '🌰', threshold: 0 },
  { level: 2, name: 'Pousse', emoji: '🌱', threshold: 50 },
  { level: 3, name: 'Jeune plante', emoji: '🌿', threshold: 200 },
  { level: 4, name: 'Arbuste', emoji: '🪴', threshold: 500 },
  { level: 5, name: 'Arbre', emoji: '🌳', threshold: 1000 },
  { level: 6, name: 'Grand chêne', emoji: '🌲', threshold: 2000 },
];

export type BadgeCode =
  | 'premiere_mission'
  | 'trois_jours_semaine'
  | 'cinq_jours_semaine'
  | 'serie_7'
  | 'cartes_50'
  | 'cartes_200'
  | 'quiz_10'
  | 'missions_5'
  | 'perseverance'
  | 'de_retour';

export const BADGES: Record<BadgeCode, { title: string; description: string; emoji: string }> = {
  premiere_mission: { title: 'Premier pas', description: 'Ta première activité est faite.', emoji: '👣' },
  trois_jours_semaine: {
    title: 'Régulier',
    description: 'Tu as travaillé 3 jours dans la même semaine.',
    emoji: '📅',
  },
  cinq_jours_semaine: {
    title: 'Très régulier',
    description: 'Tu as travaillé 5 jours dans la même semaine.',
    emoji: '🗓️',
  },
  serie_7: { title: 'Belle série', description: '7 jours de travail prévus, tous faits.', emoji: '🔥' },
  cartes_50: { title: 'Mémoire en marche', description: 'Tu as revu 50 cartes.', emoji: '🃏' },
  cartes_200: { title: 'Mémoire d’éléphant', description: 'Tu as revu 200 cartes.', emoji: '🐘' },
  quiz_10: { title: 'Curieux', description: 'Tu as terminé 10 quiz.', emoji: '❓' },
  missions_5: { title: 'Mission accomplie', description: '5 missions du jour terminées.', emoji: '🏅' },
  perseverance: {
    title: 'Je n’abandonne pas',
    description: '5 cartes oubliées, puis retrouvées grâce à tes efforts.',
    emoji: '💪',
  },
  de_retour: { title: 'De retour !', description: 'Tu as repris après une pause. Bravo !', emoji: '🌈' },
};

export interface EarnedBadge {
  code: BadgeCode;
  earnedOn: IsoDate;
}

export interface RewardSummary {
  points: number;
  stage: AvatarStage;
  nextStage: AvatarStage | null;
  /** Progression vers le stade suivant, de 0 à 1. */
  progress: number;
  badges: EarnedBadge[];
  /** Jours avec de l'effort dans la semaine en cours (lundi → aujourd'hui). */
  effortDaysThisWeek: number;
  /** Jours de travail prévus consécutifs, tous faits (les jours non prévus ne cassent rien). */
  currentStreak: number;
}

function mondayOf(date: IsoDate): IsoDate {
  const offsets: Record<string, number> = { lun: 0, mar: 1, mer: 2, jeu: 3, ven: 4, sam: 5, dim: 6 };
  return addDays(date, -offsets[weekdayKey(date)]!);
}

const hasEffort = (day: EffortDay) => dayPoints(day) > 0;

export function computeRewards(
  days: readonly EffortDay[],
  availableDays: readonly Weekday[],
  today: IsoDate,
): RewardSummary {
  const sorted = [...days].filter(hasEffort).sort((a, b) => a.date.localeCompare(b.date));
  const available = new Set(availableDays);
  const badges: EarnedBadge[] = [];
  const earn = (code: BadgeCode, date: IsoDate) => {
    if (!badges.some((b) => b.code === code)) badges.push({ code, earnedOn: date });
  };

  let points = 0;
  let cards = 0;
  let quizzes = 0;
  let sessions = 0;
  let recovered = 0;
  const daysPerWeek = new Map<IsoDate, number>();
  let previous: IsoDate | null = null;
  let streak = 0;

  for (const day of sorted) {
    points += dayPoints(day);
    cards += day.cards;
    quizzes += day.quizzes;
    sessions += day.sessions;
    recovered += day.recovered;

    if (day.activities > 0) earn('premiere_mission', day.date);
    if (cards >= 50) earn('cartes_50', day.date);
    if (cards >= 200) earn('cartes_200', day.date);
    if (quizzes >= 10) earn('quiz_10', day.date);
    if (sessions >= 5) earn('missions_5', day.date);
    if (recovered >= 5) earn('perseverance', day.date);

    const week = mondayOf(day.date);
    const count = (daysPerWeek.get(week) ?? 0) + 1;
    daysPerWeek.set(week, count);
    if (count >= 3) earn('trois_jours_semaine', day.date);
    if (count >= 5) earn('cinq_jours_semaine', day.date);

    // Série : comptée sur les jours prévus uniquement ; un jour prévu sans effort la fait repartir,
    // mais le badge déjà gagné reste acquis.
    if (previous !== null) {
      let missedPlannedDay = false;
      for (let d = addDays(previous, 1); d < day.date; d = addDays(d, 1)) {
        if (available.has(weekdayKey(d))) missedPlannedDay = true;
      }
      streak = missedPlannedDay ? 1 : streak + 1;
      // Résilience : reprendre après au moins 3 jours sans travail.
      if (daysBetween(previous, day.date) > 3) earn('de_retour', day.date);
    } else {
      streak = 1;
    }
    if (streak >= 7) earn('serie_7', day.date);
    previous = day.date;
  }

  // La série en cours ne compte que si aucun jour prévu n'a été manqué depuis le dernier effort.
  let currentStreak = streak;
  if (previous !== null) {
    for (let d = addDays(previous, 1); d < today; d = addDays(d, 1)) {
      if (available.has(weekdayKey(d))) currentStreak = 0;
    }
  }

  const stageIndex = AVATAR_STAGES.findLastIndex((s) => points >= s.threshold);
  const stage = AVATAR_STAGES[Math.max(0, stageIndex)]!;
  const nextStage = AVATAR_STAGES[stageIndex + 1] ?? null;
  const progress = nextStage ? (points - stage.threshold) / (nextStage.threshold - stage.threshold) : 1;

  const thisWeek = mondayOf(today);
  const effortDaysThisWeek = sorted.filter((d) => d.date >= thisWeek && d.date <= today).length;

  return { points, stage, nextStage, progress, badges, effortDaysThisWeek, currentStreak };
}

export interface WeekEffort {
  /** Lundi de la semaine. */
  weekStart: IsoDate;
  minutes: number;
  activities: number;
  cards: number;
  quizzes: number;
  effortDays: number;
}

/** Effort par semaine (lundi → dimanche) sur les `weeks` dernières semaines, la plus récente en dernier. */
export function weeklyEffort(
  days: readonly (EffortDay & { minutes?: number })[],
  today: IsoDate,
  weeks = 8,
): WeekEffort[] {
  const currentMonday = mondayOf(today);
  const result: WeekEffort[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(currentMonday, -7 * i);
    const weekEnd = addDays(weekStart, 6);
    const inWeek = days.filter((d) => d.date >= weekStart && d.date <= weekEnd);
    result.push({
      weekStart,
      minutes: inWeek.reduce((sum, d) => sum + (d.minutes ?? 0), 0),
      activities: inWeek.reduce((sum, d) => sum + d.activities, 0),
      cards: inWeek.reduce((sum, d) => sum + d.cards, 0),
      quizzes: inWeek.reduce((sum, d) => sum + d.quizzes, 0),
      effortDays: inWeek.filter(hasEffort).length,
    });
  }
  return result;
}
