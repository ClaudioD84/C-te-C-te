import type { FontFamilyKey, LearningSettings } from '@cote-a-cote/shared';
import type { TextStyle } from 'react-native';

/** Polices chargées au démarrage (voir app/_layout.tsx). Lexend : police lisible choisie pour la dyslexie. */
export const LEXEND_REGULAR = 'Lexend_400Regular';
export const LEXEND_SEMIBOLD = 'Lexend_600SemiBold';

const FAMILIES: Record<FontFamilyKey, string | undefined> = {
  standard: undefined,
  dyslexia: LEXEND_REGULAR,
};

/** Style de texte adapté au profil : police, taille, interlignage, espacement des lettres. */
export function learningTextStyle(settings: LearningSettings, baseSize = 20): TextStyle {
  const size = baseSize * settings.fontScale;
  return {
    fontFamily: FAMILIES[settings.fontFamily],
    fontSize: size,
    lineHeight: size * settings.lineHeight,
    letterSpacing: size * settings.letterSpacing,
  };
}
