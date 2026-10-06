import { BACKGROUNDS, type BackgroundCode, type BackgroundTheme } from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const CELL = 72;

/**
 * Motif de fond (décoratif, immobile) : teinte du thème et petits pictogrammes répétés en quinconce.
 * « Discret » (profils TDAH) : motif plus pâle et plus espacé.
 */
export function BackgroundPattern({ code, discreet }: { code: BackgroundCode; discreet: boolean }) {
  const scheme = useColorScheme();
  const theme: BackgroundTheme = BACKGROUNDS[code];
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cell = discreet ? CELL * 1.6 : CELL;
  const cols = Math.ceil(size.width / cell) + 1;
  const rows = Math.ceil(size.height / cell) + 1;

  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout)}
      style={[
        StyleSheet.absoluteFill,
        styles.clip,
        { backgroundColor: theme.tint[scheme === 'dark' ? 'dark' : 'light'] },
      ]}>
      {theme.motifs.length > 0 && size.width > 0
        ? Array.from({ length: rows * cols }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            return (
              <Text
                key={i}
                style={[
                  styles.motif,
                  {
                    left: c * cell + (r % 2 ? cell / 2 : 0) - cell / 4,
                    top: r * cell,
                    opacity: discreet ? 0.06 : 0.12,
                    transform: [{ rotate: `${((i * 37) % 50) - 25}deg` }],
                  },
                ]}>
                {theme.motifs[(r + c) % theme.motifs.length]}
              </Text>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  motif: { position: 'absolute', fontSize: 28, lineHeight: 34 },
});
