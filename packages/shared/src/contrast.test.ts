import { describe, expect, it } from 'vitest';

// Palette de l'application mobile (fichier sans dépendance).
import { Colors } from '../../../apps/mobile/src/constants/colors';
import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('calcule les extrêmes', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });
});

describe('palette (WCAG 2.2 AA)', () => {
  const backgrounds = ['background', 'backgroundElement', 'backgroundSelected'] as const;

  for (const [mode, theme] of Object.entries(Colors)) {
    it(`${mode} : texte lisible (4,5:1) sur tous les fonds`, () => {
      for (const fg of ['text', 'textSecondary', 'primary', 'warning', 'danger'] as const) {
        for (const bg of backgrounds) {
          expect(contrastRatio(theme[fg], theme[bg]), `${fg} sur ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrastRatio(theme.onPrimary, theme.primary)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${mode} : bordures et éléments graphiques visibles (3:1)`, () => {
      for (const fg of ['border', 'accent', 'primary'] as const) {
        for (const bg of backgrounds) {
          expect(contrastRatio(theme[fg], theme[bg]), `${fg} sur ${bg}`).toBeGreaterThanOrEqual(3);
        }
      }
    });
  }
});
