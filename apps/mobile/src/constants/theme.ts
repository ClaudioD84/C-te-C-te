/**
 * Couleurs et espacements de Côte à Côte.
 * Palette provisoire, en attendant l'identité visuelle définitive.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B2430',
    textSecondary: '#5B6573',
    background: '#FBF8F3',
    backgroundElement: '#F1ECE3',
    backgroundSelected: '#E5DED1',
    primary: '#1F7A6D',
    onPrimary: '#FFFFFF',
    accent: '#E8963A',
    danger: '#B3261E',
    border: '#D9D2C5',
  },
  dark: {
    text: '#F3F1EC',
    textSecondary: '#B4BAC4',
    background: '#14181E',
    backgroundElement: '#1E242C',
    backgroundSelected: '#2A313B',
    primary: '#5CC2B2',
    onPrimary: '#0B1F1C',
    accent: '#F2B36B',
    danger: '#F2B8B5',
    border: '#38404B',
  },
} as const;

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
