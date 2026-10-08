import { describe, expect, it } from 'vitest';

import { mergeSpellingWords, MAX_VOCABULARY, vocabularyCards } from './vocabulary';

describe('listes photographiées', () => {
  it('langue étudiée : le français au recto, le mot étranger au verso', () => {
    expect(
      vocabularyCards('Néerlandais', [
        { term: ' de  hond ', meaning: 'le chien' },
        { term: 'de kat', meaning: null },
        { term: 'De hond', meaning: 'le chien (bis)' },
      ]),
    ).toEqual([{ front: 'le chien', back: 'de hond' }]);
  });

  it('français : le mot au recto, sa définition au verso', () => {
    expect(
      vocabularyCards('Français', [{ term: 'un affluent', meaning: 'rivière qui se jette dans une autre' }]),
    ).toEqual([{ front: 'un affluent', back: 'rivière qui se jette dans une autre' }]);
  });

  it('au plus 60 cartes', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ term: `mot ${i}`, meaning: `sens ${i}` }));
    expect(vocabularyCards('Anglais', many)).toHaveLength(MAX_VOCABULARY);
  });

  it('mots de la dictée corrigée ajoutés à la liste de la semaine', () => {
    expect(mergeSpellingWords(['le château', 'une forêt'], ['Le château', ' ils  marchaient ', ''])).toEqual([
      'le château',
      'une forêt',
      'ils marchaient',
    ]);
    expect(
      mergeSpellingWords(
        [],
        Array.from({ length: 50 }, (_, i) => `mot${i}`),
      ),
    ).toHaveLength(40);
  });
});
