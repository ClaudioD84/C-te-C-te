import { describe, expect, it } from 'vitest';

import { celebrationPhrase, hasChestToday, TREASURES, treasureOfTheDay } from './celebration';

describe('fin de mission', () => {
  it('phrase et coffre stables dans la journée, coffre environ une fois sur trois', () => {
    expect(celebrationPhrase('a', '2026-10-06')).toBe(celebrationPhrase('a', '2026-10-06'));
    let chests = 0;
    for (let d = 1; d <= 90; d++) if (hasChestToday('enfant', `jour-${d}`)) chests++;
    expect(chests).toBeGreaterThan(15);
    expect(chests).toBeLessThan(45);
  });

  it('un nouveau trésor tant qu’il en reste', () => {
    const owned = TREASURES.slice(0, -1).map((t) => t.id);
    expect(treasureOfTheDay('a', '2026-10-06', owned).id).toBe(TREASURES.at(-1)!.id);
    expect(new Set(TREASURES.map((t) => t.id)).size).toBe(TREASURES.length);
  });
});

describe('défi bonus', () => {
  it('3 questions de fiches différentes, stables dans la journée', async () => {
    const { bonusQuestions } = await import('./celebration');
    const q = (s: string) => ({ question: s });
    const quizzes = [[q('A1'), q('A2')], [q('B1')], [], [q('C1'), q('C2')]];
    const picked = bonusQuestions(quizzes, 'jour');
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((p) => p.question[0]))).toEqual(new Set(['A', 'B', 'C']));
    expect(bonusQuestions(quizzes, 'jour')).toEqual(picked);
    expect(bonusQuestions([], 'jour')).toEqual([]);
  });
});
