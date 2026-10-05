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
