import { addDays, toIsoDate, weekdayKey, type IsoDate } from './dates';
import type { Weekday } from './profile';

/**
 * Cartable du soir : le parent note ce qu'il faut emporter et quels jours (gym, piscine, néerlandais…) ;
 * l'enfant coche sa liste la veille au soir (ou le matin même, avant 10 h).
 */
export const SCHOOL_DAYS: readonly Weekday[] = ['lun', 'mar', 'mer', 'jeu', 'ven'];

export const BAG_PRESETS: readonly { label: string; days: readonly Weekday[] }[] = [
  { label: '✏️ Plumier', days: SCHOOL_DAYS },
  { label: '📒 Journal de classe', days: SCHOOL_DAYS },
  { label: '🍎 Collation', days: SCHOOL_DAYS },
  { label: '💧 Gourde', days: SCHOOL_DAYS },
  { label: '👟 Sac de gym', days: [] },
  { label: '🩱 Maillot et bonnet de piscine', days: [] },
  { label: '🇳🇱 Cahier de néerlandais', days: [] },
  { label: '📚 Livre de bibliothèque', days: [] },
];

export interface BagItem {
  id: string;
  label: string;
  days: readonly Weekday[];
}

/** Jour pour lequel on prépare le cartable : aujourd'hui avant 10 h, sinon demain ; rien le week-end. */
export function bagDay(now: Date): { date: IsoDate; when: 'aujourdhui' | 'demain' } | null {
  const today = toIsoDate(now);
  const morning = now.getHours() < 10;
  const date = morning ? today : addDays(today, 1);
  const day = weekdayKey(date);
  if (day === 'sam' || day === 'dim') return null;
  return { date, when: morning ? 'aujourdhui' : 'demain' };
}

export function bagItemsFor(items: readonly BagItem[], date: IsoDate): BagItem[] {
  const day = weekdayKey(date);
  return items.filter((item) => item.days.includes(day));
}
