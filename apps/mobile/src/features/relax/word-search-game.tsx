import { buildWordSearch, seededRng, wordBetween, type Grade } from '@cote-a-cote/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Cell = [number, number];

/** Mots mêlés : on touche la première lettre d'un mot, puis la dernière. */
export function WordSearchGame({
  grade,
  words,
  seed,
  onWin,
}: {
  grade: Grade;
  words: readonly string[];
  seed: string;
  onWin: () => void;
}) {
  const theme = useTheme();
  const [search] = useState(() => buildWordSearch(grade, words, seededRng(seed)));
  const [start, setStart] = useState<Cell | null>(null);
  const [found, setFound] = useState<readonly string[]>([]);
  const cell = Math.floor(300 / search.size);
  const foundCells = new Set(
    search.words.filter((w) => found.includes(w.word)).flatMap((w) => w.cells.map(([r, c]) => `${r},${c}`)),
  );

  const touch = (r: number, c: number) => {
    if (!start) {
      setStart([r, c]);
      return;
    }
    const word = wordBetween(search, start, [r, c]);
    if (word && !found.includes(word.word)) {
      const next = [...found, word.word];
      setFound(next);
      setStart(null);
      if (next.length === search.words.length) onWin();
    } else {
      setStart(start[0] === r && start[1] === c ? null : [r, c]);
    }
  };

  return (
    <View style={styles.wrap}>
      <ThemedText themeColor="textSecondary">
        Touche la première lettre d’un mot, puis la dernière.
      </ThemedText>
      <View style={styles.words}>
        {search.words.map((w) => (
          <ThemedText
            key={w.word}
            type="smallBold"
            themeColor={found.includes(w.word) ? 'textSecondary' : 'text'}>
            {found.includes(w.word) ? `✓ ${w.word}` : w.word}
          </ThemedText>
        ))}
      </View>
      <View>
        {search.grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((letter, c) => {
              const selected = start?.[0] === r && start?.[1] === c;
              const isFound = foundCells.has(`${r},${c}`);
              return (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={`${letter}, ligne ${r + 1}, colonne ${c + 1}`}
                  accessibilityState={{ selected }}
                  onPress={() => touch(r, c)}
                  style={[
                    styles.cell,
                    {
                      width: cell,
                      height: cell,
                      backgroundColor: selected
                        ? theme.primary
                        : isFound
                          ? theme.backgroundSelected
                          : theme.backgroundElement,
                    },
                  ]}>
                  <ThemedText type="smallBold" style={selected ? { color: theme.onPrimary } : undefined}>
                    {letter}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, alignItems: 'center' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, justifyContent: 'center' },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 4, margin: 1 },
});
