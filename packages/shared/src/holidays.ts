import type { IsoDate } from './dates';
import type { DayOffKind } from './days-off';

/** Congé scolaire en cours (la console de l'enfant passe en mode vacances). */
export function currentHoliday<T extends { start: IsoDate; end: IsoDate; kind: DayOffKind }>(
  daysOff: readonly T[],
  today: IsoDate,
): T | undefined {
  return daysOff.find((d) => d.kind === 'conge' && d.start <= today && today <= d.end);
}

/**
 * Idées de vacances sans écran, à faire en famille : générales (aucun lieu ni lien), chacune reliée à ce
 * qu'elle fait travailler sans en avoir l'air.
 */
export const HOLIDAY_IDEAS: readonly { emoji: string; title: string; detail: string; skill: string }[] = [
  {
    emoji: '📖',
    title: 'Le quart d’heure lecture',
    detail: 'Chacun lit son livre 15 minutes, puis raconte un passage.',
    skill: 'Lecture',
  },
  {
    emoji: '🧁',
    title: 'Le chef pâtissier',
    detail: 'Suivre une recette : lire les étapes, peser et mesurer les ingrédients.',
    skill: 'Mesures et lecture',
  },
  {
    emoji: '📔',
    title: 'Le carnet de vacances',
    detail: 'Chaque jour, une phrase et un dessin (ou un ticket collé) sur la journée.',
    skill: 'Écriture',
  },
  {
    emoji: '🛒',
    title: 'Le petit marché',
    detail: 'Préparer la liste des courses et estimer le total avant de payer.',
    skill: 'Calcul',
  },
  {
    emoji: '🗺️',
    title: 'Le guide de la sortie',
    detail: 'Avant une balade, repérer le trajet sur une carte et estimer la durée.',
    skill: 'Géographie',
  },
  {
    emoji: '🎲',
    title: 'La soirée jeux',
    detail: 'Un jeu de société où l’on compte, lit ou réfléchit à plusieurs.',
    skill: 'Logique',
  },
  {
    emoji: '🔭',
    title: 'Les petits scientifiques',
    detail: 'Observer le ciel, des insectes ou une plante, et noter trois découvertes.',
    skill: 'Sciences',
  },
  {
    emoji: '🎭',
    title: 'Le spectacle maison',
    detail: 'Inventer une courte histoire et la jouer devant la famille.',
    skill: 'Expression orale',
  },
];
