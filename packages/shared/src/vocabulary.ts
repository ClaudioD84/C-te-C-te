import { foreignLanguage } from './languages';

/**
 * Listes photographiées (dictée corrigée, vocabulaire) : mots à revoir et cartes de révision, sans IA
 * supplémentaire. Pour une langue, le recto est en français et le verso dans la langue étudiée (comme les
 * cartes préparées par les fiches) ; pour le français, le mot au recto et sa définition au verso.
 */
export interface VocabularyEntry {
  term: string;
  /** Traduction en français ou courte définition ; null si la liste n'en donne pas. */
  meaning: string | null;
}

export interface VocabularyCard {
  front: string;
  back: string;
}

export const MAX_VOCABULARY = 60;
export const MAX_SPELLING_WORDS = 40;
const MAX_CARD_TEXT = 200;

const clean = (text: string) => text.trim().replace(/\s+/g, ' ').slice(0, MAX_CARD_TEXT);

/** Cartes d'une liste : seulement les mots qui ont un sens, sans doublon. */
export function vocabularyCards(subject: string, entries: readonly VocabularyEntry[]): VocabularyCard[] {
  const foreign = foreignLanguage(subject) !== null;
  const seen = new Set<string>();
  const cards: VocabularyCard[] = [];
  for (const entry of entries) {
    const term = clean(entry.term);
    const meaning = clean(entry.meaning ?? '');
    if (!term || !meaning) continue;
    const key = term.toLocaleLowerCase('fr');
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(foreign ? { front: meaning, back: term } : { front: term, back: meaning });
  }
  return cards.slice(0, MAX_VOCABULARY);
}

/** Ajoute des mots à revoir à la dictée de la semaine, sans doublon, 40 au plus. */
export function mergeSpellingWords(current: readonly string[], added: readonly string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const word of [...current, ...added]) {
    const w = word.trim().replace(/\s+/g, ' ');
    const key = w.toLocaleLowerCase('fr');
    if (!w || seen.has(key)) continue;
    seen.add(key);
    merged.push(w);
  }
  return merged.slice(0, MAX_SPELLING_WORDS);
}
