import { describe, expect, it } from 'vitest';

import {
  nextReadingText,
  READING_TEXTS,
  readingLevel,
  readingProgressMessage,
  textWords,
  wordsPerMinute,
} from './reading-aloud';

describe('lecture à voix haute', () => {
  it('des textes pour chaque niveau du primaire, pas pour le secondaire', () => {
    expect(readingLevel('P1')).toBe(1);
    expect(readingLevel('P4')).toBe(2);
    expect(readingLevel('P6')).toBe(3);
    expect(readingLevel('S1')).toBeNull();
    expect(readingLevel('M3')).toBeNull();
    for (const level of [1, 2, 3]) expect(READING_TEXTS.filter((t) => t.level === level).length).toBe(4);
    expect(new Set(READING_TEXTS.map((t) => t.id)).size).toBe(READING_TEXTS.length);
  });

  it('propose d’abord un texte pas encore lu', () => {
    const first = nextReadingText('P2', [])!;
    const second = nextReadingText('P2', [first.id])!;
    expect(second.id).not.toBe(first.id);
    expect(nextReadingText('S2', [])).toBeNull();
  });

  it('compte les mots par minute, sans la ponctuation isolée', () => {
    expect(textWords('Plouf ! Maman rit.')).toEqual(['Plouf', '!', 'Maman', 'rit.']);
    expect(wordsPerMinute('Plouf ! Maman rit.', 6)).toBe(30);
    expect(wordsPerMinute('Plouf', 0)).toBe(0);
  });

  it('ne parle que des progrès', () => {
    expect(readingProgressMessage(50, null)).toMatch(/Première/);
    expect(readingProgressMessage(55, 50)).toMatch(/5 mots de plus/);
    expect(readingProgressMessage(45, 50)).not.toMatch(/moins/);
  });
});
