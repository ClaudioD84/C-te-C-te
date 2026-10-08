import { buildPrideBookHtml, formatShortDate } from '@cote-a-cote/shared';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { printCertificate } from '@/features/print/print-pack';

import { usePrideEntries } from './api';

/** Suivi parent : les derniers moments du carnet de fierté, et le carnet complet à imprimer. */
export function PrideCard({ childId, alias }: { childId: string; alias: string }) {
  const entries = usePrideEntries(childId);
  const list = entries.data ?? [];
  if (list.length === 0) return null;
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">🌟 Carnet de fierté de {alias}</ThemedText>
      {list.slice(0, 5).map((entry) => (
        <ThemedText key={entry.id}>
          {entry.emoji} {formatShortDate(entry.date)}
          {entry.text ? ` · ${entry.text}` : ''}
        </ThemedText>
      ))}
      <Button
        variant="secondary"
        label="🖨️ Imprimer le carnet"
        onPress={() => void printCertificate(buildPrideBookHtml(alias, list)).catch(() => undefined)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
