import { CULTURE_KIND_LABELS } from '@cote-a-cote/shared';
import { Linking, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import type { CultureSuggestion } from './api';

/** « Pour aller plus loin » : suggestions issues de la base vérifiée. Rien ne s'affiche si elle est vide. */
export function CultureSuggestions({ suggestions }: { suggestions: CultureSuggestion[] | undefined }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Pour aller plus loin</ThemedText>
      {suggestions.map((s) => (
        <ThemedView key={s.id} style={styles.item}>
          <ThemedText type="small" themeColor="primary">
            {CULTURE_KIND_LABELS[s.kind]}
            {s.place ? ` · ${s.place}` : ''} · {s.subjects.join(', ')}
          </ThemedText>
          <ThemedText type="smallBold">{s.title}</ThemedText>
          <ThemedText type="small">{s.description}</ThemedText>
          {s.url ? (
            <Button variant="secondary" label="Ouvrir le lien" onPress={() => Linking.openURL(s.url!)} />
          ) : null}
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
  item: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.two },
});
