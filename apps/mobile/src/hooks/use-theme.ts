/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useMemo } from 'react';

import { CHILD_PALETTES, Colors } from '@/constants/theme';
import { useChildColor } from '@/features/child-mode/child-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;
  // Console enfant : sa couleur préférée remplace la couleur principale.
  const { color } = useChildColor();

  return useMemo(
    () => (color ? { ...Colors[theme], ...CHILD_PALETTES[color][theme] } : Colors[theme]),
    [color, theme],
  );
}
