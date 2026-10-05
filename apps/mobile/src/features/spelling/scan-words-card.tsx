import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { useSaveSpellingList, useSpellingList } from './api';

/** Vérification d'une photo : mots de dictée relevés, à utiliser pour la dictée de la semaine. */
export function ScanWordsCard({ childId, words }: { childId: string; words: readonly string[] }) {
  const current = useSpellingList(childId);
  const save = useSaveSpellingList(childId);
  const used = (current.data ?? []).join('\n') === words.join('\n');
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Mots de dictée trouvés ({words.length})</ThemedText>
      <ThemedText>{words.join(' · ')}</ThemedText>
      {used ? (
        <ThemedText accessibilityLiveRegion="polite">
          ✓ C’est la dictée de la semaine : votre enfant peut s’entraîner.
        </ThemedText>
      ) : (
        <Button
          variant="secondary"
          label={current.data ? 'Remplacer la dictée de la semaine' : 'Utiliser pour la dictée de la semaine'}
          loading={save.isPending}
          onPress={() => save.mutate([...words])}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
