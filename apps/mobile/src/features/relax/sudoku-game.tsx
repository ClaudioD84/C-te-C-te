import {
  ageGroup,
  buildSudoku,
  isSudokuSolved,
  seededRng,
  SUDOKU_SETUP,
  SUDOKU_SHAPES,
  type Grade,
} from '@cote-a-cote/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Sudoku : on touche une case vide pour faire défiler les chiffres (des formes pour les petits). */
export function SudokuGame({ grade, seed, onWin }: { grade: Grade; seed: string; onWin: () => void }) {
  const theme = useTheme();
  const age = ageGroup(grade);
  const setup = SUDOKU_SETUP[age];
  const [clues] = useState(() => buildSudoku(setup, seededRng(seed)));
  const [grid, setGrid] = useState(() => clues.map((row) => [...row]));
  const shapes = age === 'petit';
  const label = (v: number) => (v === 0 ? '' : shapes ? SUDOKU_SHAPES[v - 1]! : String(v));
  const full = grid.every((row) => row.every((v) => v > 0));
  const solved = full && isSudokuSolved(grid, setup);
  const cell = setup.size === 4 ? 64 : 48;

  const cycle = (r: number, c: number) => {
    const next = grid.map((row) => [...row]);
    next[r]![c] = (next[r]![c]! + 1) % (setup.size + 1);
    setGrid(next);
    if (next.every((row) => row.every((v) => v > 0)) && isSudokuSolved(next, setup)) onWin();
  };

  return (
    <View style={styles.wrap}>
      <ThemedText themeColor="textSecondary">
        {shapes
          ? 'Chaque forme une seule fois par ligne, par colonne et par carré.'
          : `Chaque chiffre de 1 à ${setup.size} une seule fois par ligne, par colonne et par bloc.`}
      </ThemedText>
      <View style={[styles.board, { borderColor: theme.text }]}>
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((value, c) => {
              const given = clues[r]![c]! > 0;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={`Ligne ${r + 1}, colonne ${c + 1} : ${value ? label(value) : 'vide'}${given ? ', donnée' : ''}`}
                  disabled={given || solved}
                  onPress={() => cycle(r, c)}
                  style={{
                    width: cell,
                    height: cell,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: given ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: theme.text,
                    borderRightWidth: (c + 1) % setup.boxCols === 0 && c < setup.size - 1 ? 3 : 0.5,
                    borderBottomWidth: (r + 1) % setup.boxRows === 0 && r < setup.size - 1 ? 3 : 0.5,
                  }}>
                  <ThemedText type={given ? 'subtitle' : 'default'} style={styles.value}>
                    {label(value)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {full && !solved ? (
        <ThemedText accessibilityLiveRegion="polite">
          Presque ! Regarde chaque ligne, chaque colonne et chaque bloc.
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, alignItems: 'center' },
  board: { borderWidth: 3 },
  row: { flexDirection: 'row' },
  value: { fontSize: 26, lineHeight: 32 },
});
