import { describe, expect, it } from 'vitest';

import { tableQuestions } from './table-talk';

const q = (question: string) => ({ question, choices: ['A', 'B'], answerIndex: 1, explanation: '.' });

describe('ce soir à table', () => {
  it('une question par matière d’abord, 3 au plus, avec la réponse', () => {
    const result = tableQuestions(
      [
        { subject: 'Éveil', quiz: [q('E1'), q('E2'), q('E3')] },
        { subject: 'Français', quiz: [q('F1')] },
      ],
      '2026-10-05',
    );
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.subject)).toEqual(['Éveil', 'Français', 'Éveil']);
    expect(result[0]!.answer).toBe('B');
  });

  it('stable dans la journée, rien sans quiz', () => {
    const packs = [{ subject: 'Éveil', quiz: [q('E1'), q('E2'), q('E3'), q('E4')] }];
    expect(tableQuestions(packs, 'jour')).toEqual(tableQuestions(packs, 'jour'));
    expect(tableQuestions([{ subject: 'Éveil', quiz: [] }], 'jour')).toEqual([]);
  });
});
