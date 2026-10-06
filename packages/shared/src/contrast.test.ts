import { describe, expect, it } from 'vitest';

// Palette de l'application mobile (fichier sans dépendance).
import { CHILD_PALETTES, Colors } from '../../../apps/mobile/src/constants/colors';
import { BACKGROUNDS } from './backgrounds';
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

describe('couleurs préférées de l’enfant (WCAG 2.2 AA)', () => {
  for (const [code, palette] of Object.entries(CHILD_PALETTES)) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${code} (${mode})`, () => {
        const { primary, onPrimary } = palette[mode];
        for (const bg of ['background', 'backgroundElement', 'backgroundSelected'] as const) {
          expect(contrastRatio(primary, Colors[mode][bg]), `sur ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrastRatio(onPrimary, primary)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('teintes des fonds d’écran (WCAG 2.2 AA)', () => {
  for (const [code, theme] of Object.entries(BACKGROUNDS)) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${code} (${mode}) : texte et couleur principale lisibles directement sur le fond`, () => {
        for (const fg of ['text', 'textSecondary', 'primary'] as const) {
          expect(contrastRatio(Colors[mode][fg], theme.tint[mode]), fg).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }
});

describe('couleur préférée sur chaque fond d’écran', () => {
  it('la couleur principale choisie reste lisible sur toutes les teintes', () => {
    for (const palette of Object.values(CHILD_PALETTES)) {
      for (const theme of Object.values(BACKGROUNDS)) {
        for (const mode of ['light', 'dark'] as const) {
          expect(contrastRatio(palette[mode].primary, theme.tint[mode])).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
