import { BELGIAN_ANIMALS, collectionProgress } from '@cote-a-cote/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Album des animaux de Belgique : un animal de plus tous les 25 points d'effort. */
export function AnimalAlbum({ points }: { points: number }) {
  const theme = useTheme();
  const progress = collectionProgress(points);
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">
        Mon album des animaux de Belgique ({progress.unlocked}/{progress.total})
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {progress.pointsToNext > 0
          ? `Prochain animal dans ${progress.pointsToNext} points d’effort.`
          : 'Album complet, bravo !'}
      </ThemedText>
      <View style={styles.grid}>
        {BELGIAN_ANIMALS.map((animal, i) => {
          const found = i < progress.unlocked;
          return (
            <View
              key={animal.name}
              style={[styles.tile, { borderColor: theme.backgroundSelected }]}
              accessible
              accessibilityLabel={found ? `${animal.name}, vit dans ${animal.home}` : 'Animal à découvrir'}>
              <ThemedText style={[styles.emoji, !found && styles.hidden]}>
                {found ? animal.emoji : '❓'}
              </ThemedText>
              <ThemedText type="small" style={styles.name}>
                {found ? animal.name : '…'}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    width: 92,
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 2,
  },
  emoji: { fontSize: 30, lineHeight: 38 },
  hidden: { opacity: 0.5 },
  name: { textAlign: 'center' },
});
