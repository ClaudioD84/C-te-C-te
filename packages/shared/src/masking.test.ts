import { describe, expect, it } from 'vitest';

import {
  boxContains,
  boxFromCorners,
  findSensitiveBoxes,
  matchesToken,
  nameTokens,
  normalizeWord,
  padBox,
} from './masking';

const frame = (left: number) => ({ left, top: 100, width: 80, height: 20 });

describe('masquage des noms', () => {
  it('normalise accents, majuscules et ponctuation', () => {
    expect(normalizeWord('Léa-Marie,')).toBe('leamarie');
  });

  it('découpe les noms composés', () => {
    expect(nameTokens(['Léa Dupont', "Mme D'Hondt", 'Jean-Luc'])).toEqual([
      'lea',
      'dupont',
      'mme',
      'hondt',
      'jean',
      'luc',
    ]);
  });

  it('tolère une faute de lecture sur un nom long seulement', () => {
    expect(matchesToken('Dupomt', 'dupont')).toBe(true);
    expect(matchesToken('Lia', 'lea')).toBe(false);
    expect(matchesToken('LÉA', 'lea')).toBe(true);
  });

  it('trouve les mots sensibles dans une page', () => {
    const words = [
      { text: 'Devoir', frame: frame(0) },
      { text: 'Léa', frame: frame(100) },
      { text: 'Dupont.', frame: frame(200) },
      { text: 'math', frame: frame(300) },
    ];
    const boxes = findSensitiveBoxes(words, ['Lea Dupont'], 1000, 1000);
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toEqual({ left: 95, top: 95, width: 90, height: 30 });
  });

  it('ne masque rien sans noms saisis', () => {
    expect(findSensitiveBoxes([{ text: 'Léa', frame: frame(0) }], [], 100, 100)).toEqual([]);
  });

  it("garde les zones dans l'image", () => {
    expect(padBox({ left: 0, top: 0, width: 10, height: 20 }, 12, 22)).toEqual({
      left: 0,
      top: 0,
      width: 12,
      height: 22,
    });
  });

  it('construit et teste un rectangle tracé dans les deux sens', () => {
    const box = boxFromCorners(50, 60, 10, 20);
    expect(box).toEqual({ left: 10, top: 20, width: 40, height: 40 });
    expect(boxContains(box, 30, 30)).toBe(true);
    expect(boxContains(box, 5, 30)).toBe(false);
  });
});
