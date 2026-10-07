import { describe, expect, it } from 'vitest';

// Palette de l'application mobile (fichier sans dépendance).
import { CHILD_PALETTES, Colors } from '../../../apps/mobile/src/constants/colors';
import { mixColors, SCENES, type Scene } from './background-scenes';
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

/** Couleurs des scènes : dégradé (haut, milieu, bas) et formes posées derrière le texte. */
function sceneColors(scene: Scene, mode: 'light' | 'dark'): { stops: string[]; shapes: string[] } {
  const [top, bottom] = scene.gradient[mode];
  return {
    stops: [top, mixColors(top, bottom, 0.5), bottom],
    shapes: scene.shapes.map((s) => s.color[mode]),
  };
}

describe('scènes des fonds d’écran (WCAG 2.2 AA)', () => {
  it('chaque fond, sauf le fond uni, a sa scène', () => {
    expect(Object.keys(SCENES).sort()).toEqual(
      Object.keys(BACKGROUNDS)
        .filter((c) => c !== 'uni')
        .sort(),
    );
  });
  for (const [code, scene] of Object.entries(SCENES) as [string, Scene][]) {
    for (const mode of ['light', 'dark'] as const) {
      it(`${code} (${mode}) : texte lisible sur le dégradé et sur les formes`, () => {
        const { stops, shapes } = sceneColors(scene, mode);
        for (const bg of [...stops, ...shapes]) {
          for (const fg of ['text', 'textSecondary'] as const) {
            expect(contrastRatio(Colors[mode][fg], bg), `${fg} sur ${bg}`).toBeGreaterThanOrEqual(4.5);
          }
        }
        for (const bg of stops) {
          expect(contrastRatio(Colors[mode].primary, bg), `primary sur ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }
});

describe('couleur préférée sur chaque fond d’écran', () => {
  it('la couleur principale choisie reste lisible sur tous les dégradés', () => {
    for (const palette of Object.values(CHILD_PALETTES)) {
      for (const scene of Object.values(SCENES) as Scene[]) {
        for (const mode of ['light', 'dark'] as const) {
          for (const bg of sceneColors(scene, mode).stops) {
            expect(contrastRatio(palette[mode].primary, bg), bg).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });
});
