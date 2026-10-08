import type { IsoDate } from '@cote-a-cote/shared';

import { MOODS, type Mood } from '@/features/mood/mood';
import type { SessionItem } from '@/features/planning/api';

/**
 * Activités à afficher dans la mission du jour. Fatigué : seulement l'essentiel, c'est-à-dire la première
 * activité pas encore faite au moment du choix, fixée pour la journée (une fois faite, la suivante n'est
 * pas proposée).
 */
export function missionItems(items: readonly SessionItem[], mood: Mood | null | undefined, today: IsoDate) {
  const allRemaining = items.filter((item) => item.done_at === null);
  const limit = mood ? MOODS[mood].items : null;
  if (!limit) return { allRemaining, remaining: allRemaining };
  const first = Math.max(
    0,
    items.findIndex((item) => item.done_at === null || item.done_at >= today),
  );
  return {
    allRemaining,
    remaining: items.slice(first, first + limit).filter((item) => item.done_at === null),
  };
}
