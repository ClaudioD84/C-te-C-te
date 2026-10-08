import { describe, expect, it } from 'vitest';

import { questionSpeech, questionText, tableSeries } from './times-tables';

describe('tables', () => {
  it('10 questions des tables choisies, réponses justes, stable', () => {
    const series = tableSeries([3, 7], 'multiplication', 'graine');
    expect(series).toHaveLength(10);
    for (const q of series) {
      expect([3, 7]).toContain(q.a);
      expect(q.b).toBeGreaterThanOrEqual(1);
      expect(q.b).toBeLessThanOrEqual(10);
      expect(q.answer).toBe(q.a * q.b);
    }
    expect(tableSeries([3, 7], 'multiplication', 'graine')).toEqual(series);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!.a === series[i - 1]!.a && series[i]!.b === series[i - 1]!.b).toBe(false);
    }
  });

  it('additions et textes', () => {
    const [q] = tableSeries([4], 'addition', 'x', 1);
    expect(q!.answer).toBe(4 + q!.b);
    expect(questionText({ a: 3, b: 4, operation: 'multiplication', answer: 12 })).toBe('3 × 4');
    expect(questionSpeech({ a: 3, b: 4, operation: 'addition', answer: 7 })).toBe('3 plus 4');
  });
});
