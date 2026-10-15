import { schoolLevel, type Grade } from './school';

/**
 * Présentation de la console de l'enfant : ludique (« enfant ») ou sobre (« ado » : pas d'avatar ni de badges
 * mis en avant, pas de « Bravo ! », « Youpi » ni blagues pour enfants). Sobre par défaut au secondaire ; le parent
 * peut choisir l'autre.
 */
export const PRESENTATIONS = ['enfant', 'ado'] as const;
export type Presentation = (typeof PRESENTATIONS)[number];

export const PRESENTATION_LABELS: Record<Presentation, string> = {
  enfant: 'Ludique (enfant)',
  ado: 'Sobre (ado)',
};

export function defaultPresentation(grade: Grade): Presentation {
  return schoolLevel(grade) === 'secondaire' ? 'ado' : 'enfant';
}

/** Texte selon la présentation : la version « ado » est sobre (parfois vide). */
export function byTone(tone: Presentation, enfant: string, ado: string): string {
  return tone === 'ado' ? ado : enfant;
}
