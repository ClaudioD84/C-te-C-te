/**
 * Couleurs de Côte à Côte (palette provisoire, en attendant l'identité visuelle définitive).
 * Contrastes vérifiés par un test (WCAG 2.2 AA) : texte ≥ 4,5:1 sur les trois fonds,
 * bordures et éléments graphiques ≥ 3:1. Fichier sans dépendance pour pouvoir être testé.
 */
export const Colors = {
  light: {
    text: '#1B2430',
    textSecondary: '#525B68',
    background: '#FBF8F3',
    backgroundElement: '#F1ECE3',
    backgroundSelected: '#E5DED1',
    primary: '#1A6B60',
    onPrimary: '#FFFFFF',
    /** Éléments graphiques (barres, contours) d'alerte ou de pause. */
    accent: '#A85C0C',
    /** Texte d'avertissement. */
    warning: '#8A4B00',
    danger: '#B3261E',
    border: '#857D6F',
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
    warning: '#F2B36B',
    danger: '#F2B8B5',
    border: '#737C8A',
  },
} as const;

/**
 * Couleur préférée de l'enfant pour sa console : remplace la couleur principale. Chaque variante respecte
 * les mêmes contrastes que la palette (vérifiés par le même test).
 */
export const CHILD_PALETTES = {
  vert: {
    label: '🟢 Vert',
    light: { primary: '#1A6B60', onPrimary: '#FFFFFF' },
    dark: { primary: '#5CC2B2', onPrimary: '#0B1F1C' },
  },
  bleu: {
    label: '🔵 Bleu',
    light: { primary: '#1D5FA8', onPrimary: '#FFFFFF' },
    dark: { primary: '#8EC5FF', onPrimary: '#0A1A2E' },
  },
  violet: {
    label: '🟣 Violet',
    light: { primary: '#6B3FA0', onPrimary: '#FFFFFF' },
    dark: { primary: '#C9A8F5', onPrimary: '#1E0F33' },
  },
  rose: {
    label: '🩷 Rose',
    light: { primary: '#A3305F', onPrimary: '#FFFFFF' },
    dark: { primary: '#F5A3C7', onPrimary: '#330A1C' },
  },
  orange: {
    label: '🟠 Orange',
    light: { primary: '#9A4508', onPrimary: '#FFFFFF' },
    dark: { primary: '#F5B27A', onPrimary: '#2E1503' },
  },
  rouge: {
    label: '🔴 Rouge',
    light: { primary: '#B02A22', onPrimary: '#FFFFFF' },
    dark: { primary: '#F7A59F', onPrimary: '#330B08' },
  },
} as const;
export type ChildPaletteCode = keyof typeof CHILD_PALETTES;
