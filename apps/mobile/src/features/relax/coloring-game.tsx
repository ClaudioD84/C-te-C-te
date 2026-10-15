import { COLORING_PALETTE, mandala, type Grade } from '@cote-a-cote/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const COLOR_NAMES = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet', 'rose', 'brun', 'blanc'];

/** Coloriage d'un mandala : on choisit une couleur puis on touche une zone (ses parties symétriques aussi). */
export function ColoringGame({
  grade,
  variant,
  onWin,
}: {
  grade: Grade;
  variant: number;
  onWin: () => void;
}) {
  const theme = useTheme();
  const [design] = useState(() => mandala(grade, variant));
  const [color, setColor] = useState(COLORING_PALETTE[0]!);
  const [fills, setFills] = useState<Record<number, string>>({});
  const cell = design.size <= 8 ? 36 : 24;
  const zoneAt = (r: number, c: number) => design.zones[r]?.[c] ?? -1;

  return (
    <View style={styles.wrap}>
      <View style={styles.palette} accessibilityRole="radiogroup" accessibilityLabel="Couleurs">
        {COLORING_PALETTE.map((c, i) => (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityLabel={COLOR_NAMES[i]}
            accessibilityState={{ checked: color === c }}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c, borderColor: color === c ? theme.text : theme.border },
              color === c && styles.swatchSelected,
            ]}
          />
        ))}
      </View>
      <View style={{ width: cell * design.size }}>
        {design.zones.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((zone, c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Zone ${zone + 1}`}
                onPress={() => setFills((f) => ({ ...f, [zone]: color }))}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: fills[zone] ?? '#FFFFFF',
                  borderColor: '#5F5A54',
                  // Traits seulement entre deux zones différentes : on voit les formes à colorier.
                  borderTopWidth: zoneAt(r - 1, c) !== zone ? 1 : 0,
                  borderBottomWidth: zoneAt(r + 1, c) !== zone ? 1 : 0,
                  borderLeftWidth: zoneAt(r, c - 1) !== zone ? 1 : 0,
                  borderRightWidth: zoneAt(r, c + 1) !== zone ? 1 : 0,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Toutes les parties d’une même zone se colorient ensemble.
      </ThemedText>
      <Button variant="secondary" label="J’ai fini mon dessin" onPress={onWin} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, alignItems: 'center' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center' },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  swatchSelected: { borderWidth: 4 },
  row: { flexDirection: 'row' },
});
