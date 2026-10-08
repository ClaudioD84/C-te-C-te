/** Couleurs, polices et espacements de Côte à Côte. */

import { Platform } from 'react-native';

import { CHILD_PALETTES, Colors } from './colors';

export { CHILD_PALETTES, Colors };

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', ui-sans-serif, sans-serif",
    mono: 'ui-monospace, Menlo, Consolas, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
/** Taille minimale d'une zone tactile (recommandation d'accessibilité). */
export const MinTouchSize = 48;
