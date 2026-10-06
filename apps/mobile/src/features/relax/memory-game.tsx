import { memoryDeck, seededRng, type Grade, type Interest } from '@cote-a-cote/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Memory : on retourne deux cartes ; si elles ne vont pas ensemble, elles restent visibles jusqu'à la
 * carte suivante (pas de délai qui presse).
 */
export function MemoryGame({
  grade,
  interests,
  seed,
  onWin,
}: {
  grade: Grade;
  interests: readonly Interest[];
  seed: string;
  onWin: () => void;
}) {
  const theme = useTheme();
  const [deck] = useState(() => memoryDeck(grade, interests, seededRng(seed)));
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<ReadonlySet<string>>(new Set());

  const flip = (index: number) => {
    const card = deck[index]!;
    if (found.has(card.symbol) || open.includes(index)) return;
    if (open.length !== 1) {
      setOpen([index]);
      return;
    }
    const first = deck[open[0]!]!;
    setOpen([open[0]!, index]);
    if (first.symbol === card.symbol) {
      const next = new Set(found).add(card.symbol);
      setFound(next);
      setOpen([]);
      if (next.size * 2 === deck.length) onWin();
    }
  };

  return (
    <View style={styles.wrap}>
      <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
        Paires trouvées : {found.size} sur {deck.length / 2}
      </ThemedText>
      <View style={styles.grid}>
        {deck.map((card, index) => {
          const visible = found.has(card.symbol) || open.includes(index);
          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={
                visible ? `Carte ${index + 1} : ${card.symbol}` : `Carte ${index + 1}, cachée`
              }
              onPress={() => flip(index)}
              style={[
                styles.card,
                {
                  backgroundColor: visible ? theme.backgroundElement : theme.primary,
                  borderColor: found.has(card.symbol) ? theme.accent : theme.border,
                },
              ]}>
              <ThemedText style={styles.symbol}>{visible ? card.symbol : ''}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center' },
  card: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 32, lineHeight: 40 },
});
