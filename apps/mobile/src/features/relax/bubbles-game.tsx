import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const COUNT = 30;

/** Papier bulle : on éclate les bulles une à une, puis une nouvelle feuille. */
export function BubblesGame({ onWin }: { onWin: () => void }) {
  const theme = useTheme();
  const [popped, setPopped] = useState<ReadonlySet<number>>(new Set());
  const done = popped.size === COUNT;

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {Array.from({ length: COUNT }, (_, i) => {
          const isPopped = popped.has(i);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={isPopped ? `Bulle ${i + 1}, éclatée` : `Bulle ${i + 1}`}
              disabled={isPopped}
              onPress={() => {
                const next = new Set(popped).add(i);
                setPopped(next);
                if (next.size === COUNT) onWin();
              }}
              style={[
                styles.bubble,
                {
                  backgroundColor: isPopped ? 'transparent' : theme.backgroundSelected,
                  borderColor: theme.border,
                  borderStyle: isPopped ? 'dashed' : 'solid',
                },
              ]}>
              <ThemedText aria-hidden>{isPopped ? '·' : ''}</ThemedText>
            </Pressable>
          );
        })}
      </View>
      {done ? (
        <>
          <ThemedText accessibilityLiveRegion="polite">Toutes éclatées ! Pop pop pop.</ThemedText>
          <Button variant="secondary" label="Nouvelle feuille" onPress={() => setPopped(new Set())} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, width: 5 * 52 + 4 * Spacing.two },
  bubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
