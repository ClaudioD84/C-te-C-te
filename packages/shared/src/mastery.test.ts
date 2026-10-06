import { describe, expect, it } from 'vitest';

import { masterySummary } from './mastery';

describe('maîtrise visible', () => {
  it('cartes connues, tables maîtrisées, mots écrits, livres', () => {
    const m = masterySummary({
      cards: [
        { subject: 'Néerlandais', repetitions: 3, intervalDays: 8 },
        { subject: 'Néerlandais', repetitions: 4, intervalDays: 15 },
        { subject: 'Éveil', repetitions: 3, intervalDays: 7 },
        { subject: 'Éveil', repetitions: 1, intervalDays: 1 },
      ],
      tableSeries: [{ '2': [5, 5], '5': [3, 5] }, { '2': [5, 5], '5': [4, 5] }, { '9': [3, 3] }],
      dictations: [{ score: 4 }, { score: 6 }],
      books: ['Le Petit Prince', 'le petit prince ', 'Matilda'],
    });
    expect(m.knownCards).toBe(3);
    expect(m.cardsBySubject).toEqual([
      { subject: 'Néerlandais', known: 2 },
      { subject: 'Éveil', known: 1 },
    ]);
    // Table de 2 : 10/10 ; table de 5 : 7/10 (pas encore) ; table de 9 : trop peu de réponses.
    expect(m.tablesMastered).toEqual([2]);
    expect(m.wordsWritten).toBe(10);
    expect(m.books).toBe(2);
  });
});
