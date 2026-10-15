/**
 * Maîtrise visible (F11) : ce que l'enfant SAIT, pas ce qu'il a fait. Calculé à partir de ses cartes
 * (connues quand elles reviennent rarement), de ses séries de tables, de ses dictées et de ses lectures.
 */
export interface MasteryInput {
  cards: readonly { subject: string; repetitions: number; intervalDays: number }[];
  /** Résultats des tables par série : { "7": [justes, total] }. */
  tableSeries: readonly Record<string, readonly [number, number]>[];
  dictations: readonly { score: number }[];
  books: readonly string[];
}

export interface Mastery {
  knownCards: number;
  cardsBySubject: { subject: string; known: number }[];
  tablesMastered: number[];
  wordsWritten: number;
  books: number;
}

/** Une carte est connue quand elle a été réussie au moins 3 fois et ne revient plus avant une semaine. */
export const KNOWN_CARD = { repetitions: 3, intervalDays: 7 } as const;
/** Une table est maîtrisée avec au moins 10 réponses et 90 % de réponses justes du premier coup. */
export const TABLE_MASTERY = { answers: 10, rate: 0.9 } as const;

export function masterySummary(input: MasteryInput): Mastery {
  const known = input.cards.filter(
    (c) => c.repetitions >= KNOWN_CARD.repetitions && c.intervalDays >= KNOWN_CARD.intervalDays,
  );
  const bySubject = new Map<string, number>();
  for (const card of known) bySubject.set(card.subject, (bySubject.get(card.subject) ?? 0) + 1);

  const tables = new Map<number, [number, number]>();
  for (const series of input.tableSeries) {
    for (const [table, [ok, total]] of Object.entries(series)) {
      const n = Number(table);
      if (!Number.isInteger(n)) continue;
      const [a, b] = tables.get(n) ?? [0, 0];
      tables.set(n, [a + ok, b + total]);
    }
  }
  const tablesMastered = [...tables]
    .filter(([, [ok, total]]) => total >= TABLE_MASTERY.answers && ok / total >= TABLE_MASTERY.rate)
    .map(([n]) => n)
    .sort((a, b) => a - b);

  return {
    knownCards: known.length,
    cardsBySubject: [...bySubject]
      .map(([subject, n]) => ({ subject, known: n }))
      .sort((a, b) => b.known - a.known || a.subject.localeCompare(b.subject)),
    tablesMastered,
    wordsWritten: input.dictations.reduce((sum, d) => sum + d.score, 0),
    books: new Set(input.books.map((b) => b.trim().toLowerCase()).filter(Boolean)).size,
  };
}
