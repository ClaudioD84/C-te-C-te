import type { Activity } from './planning';

/**
 * Pictogrammes de la console enfant pour les jeunes lecteurs (F7, F12) : ils complètent le texte, sans le
 * remplacer (les lecteurs d'écran lisent le texte, les pictogrammes sont décoratifs).
 */
export const ACTIVITY_PICTOGRAMS: Record<Activity, string> = {
  faire: '✏️',
  etudier: '📖',
  reviser: '🔁',
  se_tester: '✅',
};

const SUBJECT_PICTOGRAMS: [RegExp, string][] = [
  // Avant les sciences : « Éducation physique » ne doit pas être prise pour de la physique.
  [/[ée]ducation physique|gym|sport|natation/i, '⚽'],
  [/math|calcul|g[ée]om[ée]trie|num[ée]ration/i, '🔢'],
  [
    /fran[cç]ais|lecture|orthographe|grammaire|conjugaison|dict[ée]e|vocabulaire|r[ée]daction|po[ée]sie/i,
    '📚',
  ],
  [/n[ée]erlandais|anglais|allemand|espagnol|italien|langue|latin|grec/i, '🗣️'],
  [/histoire|historique/i, '🏛️'],
  [/g[ée]ographie|[ée]veil|monde/i, '🌍'],
  [/science|biologie|physique|chimie|nature/i, '🔬'],
  [/musique|chant/i, '🎵'],
  [/dessin|art|bricolage|manuel/i, '🎨'],
  [/religion|morale|philosophie|citoyennet[ée]/i, '💬'],
  [/informatique|num[ée]rique|technologie/i, '💻'],
];

export function subjectPictogram(subject: string): string {
  return SUBJECT_PICTOGRAMS.find(([pattern]) => pattern.test(subject))?.[1] ?? '📝';
}

/** Matières pour lesquelles les supports visuels de calcul (F12, dyscalculie) s'appliquent. */
export function isMathSubject(subject: string): boolean {
  return /math|calcul|g[ée]om[ée]trie|num[ée]ration/i.test(subject);
}
