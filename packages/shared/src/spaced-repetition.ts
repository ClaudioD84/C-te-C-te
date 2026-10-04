import { addDays, type IsoDate } from './dates';

/**
 * Répétition espacée (F9), variante simplifiée de SM-2 :
 * une carte bien connue revient de plus en plus tard, une carte oubliée revient demain.
 */

export type ReviewRating = 'oublie' | 'difficile' | 'facile';

export interface CardState {
  intervalDays: number;
  ease: number;
  repetitions: number;
  dueOn: IsoDate;
}

export const MIN_EASE = 1.3;
export const MAX_EASE = 3;

export function newCardState(today: IsoDate): CardState {
  return { intervalDays: 0, ease: 2.5, repetitions: 0, dueOn: today };
}

/**
 * Nouvel état après une révision.
 * `deadline` (date de l'évaluation) : la carte revient au plus tard la veille, pour être revue avant.
 */
export function reviewCard(
  state: CardState,
  rating: ReviewRating,
  today: IsoDate,
  deadline?: IsoDate,
): CardState {
  let { intervalDays, ease, repetitions } = state;

  if (rating === 'oublie') {
    repetitions = 0;
    intervalDays = 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
  } else if (rating === 'difficile') {
    intervalDays = repetitions === 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
    repetitions += 1;
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else {
    intervalDays = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(intervalDays * ease);
    repetitions += 1;
    ease = Math.min(MAX_EASE, ease + 0.1);
  }

  let dueOn = addDays(today, intervalDays);
  if (deadline) {
    const dayBefore = addDays(deadline, -1);
    if (today < dayBefore && dueOn > dayBefore) dueOn = dayBefore;
  }
  return { intervalDays, ease: Math.round(ease * 100) / 100, repetitions, dueOn };
}
