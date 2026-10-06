import {
  ageGroup,
  isTaquinSolved,
  moveTile,
  seededRng,
  shuffledTaquin,
  TAQUIN_SETUP,
  type Grade,
} from '@cote-a-cote/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Taquin : on touche une pièce voisine de la case vide pour la faire glisser ; ranger de 1 à la fin. */
export function TaquinGame({ grade, seed, onWin }: { grade: Grade; seed: string; onWin: () => void }) {
  const theme = useTheme();
  const { size, moves } = TAQUIN_SETUP[ageGroup(grade)];
  const [board, setBoard] = useState(() => shuffledTaquin(size, moves, seededRng(seed)));
  const solved = isTaquinSolved(board);
  const tile = size === 4 ? 64 : 80;

  return (
    <View style={styles.wrap}>
      <ThemedText themeColor="textSecondary">
        Range les nombres de 1 à {size * size - 1} : touche une pièce à côté de la case vide.
      </ThemedText>
      <View style={[styles.board, { width: tile * size + 4 * (size + 1) }]}>
        {board.map((value, index) =>
          value === 0 ? (
            <View key="vide" style={{ width: tile, height: tile }} accessibilityLabel="Case vide" />
          ) : (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Pièce ${value}`}
              disabled={solved}
              onPress={() => {
                const next = moveTile(board, size, index);
                if (!next) return;
                setBoard(next);
                if (isTaquinSolved(next)) onWin();
              }}
              style={[
                styles.tile,
                {
                  width: tile,
                  height: tile,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText type="subtitle">{value}</ThemedText>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, alignItems: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 },
  tile: { borderRadius: Spacing.two, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
