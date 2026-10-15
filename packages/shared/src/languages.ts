import { speechLanguage } from './dictation';
import { shuffled, type Rng } from './relax';

/**
 * Cartes de langues lues à voix haute (synthèse vocale de l'appareil, hors connexion, sans IA). Au recto le
 * français, au verso la langue étudiée (consigne donnée à la préparation des fiches).
 */
const LANGUAGE_NAMES: Record<string, string> = {
  'nl-BE': 'néerlandais',
  'en-GB': 'anglais',
  'de-DE': 'allemand',
  'es-ES': 'espagnol',
  'it-IT': 'italien',
};

/** Langue étrangère d'une matière (« Néerlandais » → nl-BE), sinon null. */
export function foreignLanguage(subject: string): string | null {
  const language = speechLanguage(subject);
  return language === 'fr-BE' ? null : language;
}

export function languageName(subject: string): string | null {
  return LANGUAGE_NAMES[speechLanguage(subject)] ?? null;
}

export interface LanguageCard {
  id: string;
  front: string;
  back: string;
  subject: string;
}

export interface ListeningQuestion {
  card: LanguageCard;
  /** Sens en français proposés (dont le bon), dans le désordre. */
  options: string[];
}

export const LISTENING_ROUND = 8;
export const LISTENING_MIN_CARDS = 4;

/**
 * « Écoute et choisis » : on entend le mot dans la langue étudiée, on choisit son sens parmi 4. Les
 * autres choix viennent de cartes de la même langue, avec un sens différent.
 */
export function listeningRound(
  cards: readonly LanguageCard[],
  rng: Rng,
  count = LISTENING_ROUND,
): ListeningQuestion[] {
  const usable = cards.filter((c) => foreignLanguage(c.subject) && c.front.trim() && c.back.trim());
  return shuffled(usable, rng)
    .slice(0, count)
    .flatMap((card) => {
      const language = speechLanguage(card.subject);
      const others = [
        ...new Set(
          usable
            .filter((c) => speechLanguage(c.subject) === language && c.front !== card.front)
            .map((c) => c.front),
        ),
      ];
      if (others.length < LISTENING_MIN_CARDS - 1) return [];
      return [{ card, options: shuffled([card.front, ...shuffled(others, rng).slice(0, 3)], rng) }];
    });
}
