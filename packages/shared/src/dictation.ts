import { isMathSubject } from './pictograms';

/**
 * Entraînement à l'écoute (« écoute et écris ») : l'application dit un mot clé de la fiche, l'enfant
 * l'écrit. Sans chronomètre ; les accents oubliés sont signalés sans compter comme une erreur.
 */
export const MAX_DICTATION_WORDS = 10;

/** Mots clés d'une fiche utilisables : courts (3 mots au plus), sans chiffres ni symboles. */
export function dictationWords(subject: string, terms: readonly { term: string }[]): string[] {
  if (isMathSubject(subject)) return [];
  const words = terms
    .map((t) => t.term.trim().replace(/\s+/g, ' '))
    .filter((t) => t.length >= 2 && t.length <= 30 && t.split(' ').length <= 3 && /^[\p{L}' -]+$/u.test(t));
  return [...new Set(words)].slice(0, MAX_DICTATION_WORDS);
}

const stripAccents = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const normalize = (text: string) =>
  text.trim().replace(/\s+/g, ' ').replace(/[’`]/g, "'").toLocaleLowerCase('fr');

export type SpellingResult = 'juste' | 'accents' | 'a_revoir';

/** Majuscules et espaces ne comptent pas ; seuls les accents différents donnent « accents ». */
export function checkSpelling(expected: string, typed: string): SpellingResult {
  const a = normalize(expected);
  const b = normalize(typed);
  if (a === b) return 'juste';
  if (stripAccents(a) === stripAccents(b)) return 'accents';
  return 'a_revoir';
}

/** Langue de la voix selon la matière (langues modernes), sinon le français de Belgique. */
export function speechLanguage(subject: string): string {
  const s = stripAccents(subject).toLowerCase();
  if (s.includes('neerland')) return 'nl-BE';
  if (s.includes('anglais')) return 'en-GB';
  if (s.includes('allemand')) return 'de-DE';
  if (s.includes('espagnol')) return 'es-ES';
  if (s.includes('italien')) return 'it-IT';
  return 'fr-BE';
}

/**
 * Lecture à voix haute d'une fiche, morceau par morceau (titre, chaque partie, mots importants) :
 * l'écran surligne la partie lue.
 */
export function ficheSegments(fiche: {
  title: string;
  sections: readonly { heading: string; points: readonly string[] }[];
  keyTerms: readonly { term: string; definition: string }[];
}): string[] {
  const end = (text: string) => (/[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);
  return [
    end(fiche.title),
    ...fiche.sections.map((s) => [end(s.heading), ...s.points.map(end)].join(' ')),
    ...(fiche.keyTerms.length > 0
      ? [['Mots importants.', ...fiche.keyTerms.map((t) => end(`${t.term} : ${t.definition}`))].join(' ')]
      : []),
  ];
}

/** Mots de la dictée saisis par le parent (un par ligne ou séparés par des virgules), sans doublon. */
export function parseSpellingWords(text: string): string[] {
  const words = text
    .split(/[\n,;]+/)
    .map((w) => w.trim().replace(/\s+/g, ' '))
    .filter((w) => w.length > 0 && w.length <= 40);
  return [...new Set(words)].slice(0, 40);
}
