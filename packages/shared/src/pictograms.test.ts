import { describe, expect, it } from 'vitest';

import { isMathSubject, subjectPictogram } from './pictograms';

describe('pictogrammes', () => {
  it('reconnaît les matières courantes du journal de classe', () => {
    expect(subjectPictogram('Mathématiques')).toBe('🔢');
    expect(subjectPictogram('Français')).toBe('📚');
    expect(subjectPictogram('Néerlandais')).toBe('🗣️');
    expect(subjectPictogram('Éveil')).toBe('🌍');
    expect(subjectPictogram('Éveil historique')).toBe('🏛️');
    expect(subjectPictogram('Éducation physique')).toBe('⚽');
    expect(subjectPictogram('Atelier du vendredi')).toBe('📝');
  });

  it('repère les matières de calcul', () => {
    expect(isMathSubject('Mathématiques')).toBe(true);
    expect(isMathSubject('Calcul mental')).toBe(true);
    expect(isMathSubject('Français')).toBe(false);
  });
});
