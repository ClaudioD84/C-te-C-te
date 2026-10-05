import { describe, expect, it } from 'vitest';

import { compareWithLastWeek, describeDelta, mondayOfWeek, subjectProgress } from './progress';

const day = (date: string, activities = 0, cards = 0, quizzes = 0, minutes = 0) => ({
  date,
  activities,
  cards,
  quizzes,
  sessions: 0,
  recovered: 0,
  minutes,
});

describe('compareWithLastWeek', () => {
  // Mercredi 7 octobre 2026.
  const today = '2026-10-07';

  it('compare les mêmes jours de la semaine (lundi → mercredi)', () => {
    const days = [
      day('2026-10-05', 1, 0, 0, 20), // lundi
      day('2026-10-07', 1, 5, 1, 25), // mercredi
      day('2026-09-28', 1, 0, 0, 30), // lundi précédent
      day('2026-10-01', 2, 0, 0, 40), // jeudi précédent : hors comparaison
    ];
    const byKey = Object.fromEntries(compareWithLastWeek(days, today).map((c) => [c.key, c]));
    expect(byKey.minutes).toMatchObject({ current: 45, previous: 30, delta: 15 });
    expect(byKey.effortDays).toMatchObject({ current: 2, previous: 1, delta: 1 });
    expect(byKey.cards).toMatchObject({ current: 5, previous: 0, delta: 5 });
  });

  it('le lundi, ne compare que les lundis', () => {
    const days = [day('2026-10-05', 1, 0, 0, 10), day('2026-09-29', 3, 0, 0, 60)];
    const minutes = compareWithLastWeek(days, '2026-10-05').find((c) => c.key === 'minutes')!;
    expect(minutes).toMatchObject({ current: 10, previous: 0 });
  });
});

describe('mondayOfWeek', () => {
  it('donne le lundi, y compris le dimanche', () => {
    expect(mondayOfWeek('2026-10-07')).toBe('2026-10-05');
    expect(mondayOfWeek('2026-10-11')).toBe('2026-10-05');
    expect(mondayOfWeek('2026-10-05')).toBe('2026-10-05');
  });
});

describe('describeDelta', () => {
  it('formule l’écart sans jugement', () => {
    expect(describeDelta(0)).toBe('autant que la semaine dernière');
    expect(describeDelta(15)).toBe('+15 par rapport à la semaine dernière');
    expect(describeDelta(-3)).toBe('−3 par rapport à la semaine dernière');
  });
});

describe('subjectProgress', () => {
  it('calcule le taux de réussite aux quiz et trie par temps de travail', () => {
    const rows = subjectProgress([
      { subject: 'Éveil', minutes: 20, activities: 1, cards: 10, quizzes: 2, quizScore: 7, quizTotal: 10 },
      {
        subject: 'Mathématiques',
        minutes: 60,
        activities: 3,
        cards: 0,
        quizzes: 0,
        quizScore: 0,
        quizTotal: 0,
      },
    ]);
    expect(rows.map((r) => r.subject)).toEqual(['Mathématiques', 'Éveil']);
    expect(rows[0]!.quizRate).toBeNull();
    expect(rows[1]!.quizRate).toBe(70);
  });
});
