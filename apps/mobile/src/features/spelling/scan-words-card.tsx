import { mergeSpellingWords } from '@cote-a-cote/shared';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { useSaveSpellingList, useSpellingList } from './api';

/**
 * Vérification d'une photo : mots de dictée relevés. Liste préparée : elle devient la dictée de la semaine.
 * Dictée corrigée : les mots à revoir s'ajoutent à la dictée de la semaine.
 */
export function ScanWordsCard({
  childId,
  words,
  corrected = false,
}: {
  childId: string;
  words: readonly string[];
  corrected?: boolean;
}) {
  const current = useSpellingList(childId);
  const save = useSaveSpellingList(childId);
  const list = current.data ?? [];
  const merged = mergeSpellingWords(list, words);
  const used = corrected
    ? merged.length === list.length && list.length > 0
    : list.join('\n') === words.join('\n');
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        {corrected ? `Mots à revoir (${words.length})` : `Mots de dictée trouvés (${words.length})`}
      </ThemedText>
      {corrected ? (
        <ThemedText type="small" themeColor="textSecondary">
          Les mots où il y avait une faute, écrits correctement.
        </ThemedText>
      ) : null}
      <ThemedText>{words.join(' · ')}</ThemedText>
      {used ? (
        <ThemedText accessibilityLiveRegion="polite">
          ✓ {corrected ? 'Ajoutés à la dictée de la semaine' : 'C’est la dictée de la semaine'} : votre enfant
          peut s’entraîner.
        </ThemedText>
      ) : corrected ? (
        <Button
          variant="secondary"
          label="Ajouter à la dictée de la semaine"
          loading={save.isPending}
          onPress={() => save.mutate(merged)}
        />
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
