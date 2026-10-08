import { formatShortDate, READING_TEXTS } from '@cote-a-cote/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useAloudReadings } from './aloud-api';

/** Suivi parent : vitesse de lecture à voix haute de l'enfant au fil du temps (ses progrès seulement). */
export function AloudReadingCard({ childId }: { childId: string }) {
  const theme = useTheme();
  const readings = useAloudReadings(childId);
  const list = readings.data ?? [];
  if (list.length === 0) return null;
  const best = Math.max(...list.map((r) => r.wpm), 1);
  const last = list.at(-1)!;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Lecture à voix haute</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Mots lus par minute, lecture après lecture. À comparer seulement avec ses propres lectures.
      </ThemedText>
      {list.slice(-8).map((r) => (
        <View key={r.id} style={styles.row}>
          <ThemedText type="small" style={styles.date}>
            {formatShortDate(r.date)}
          </ThemedText>
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[styles.bar, { width: `${(r.wpm / best) * 100}%`, backgroundColor: theme.primary }]}
            />
          </View>
          <ThemedText type="small">{r.wpm} mots/min</ThemedText>
        </View>
      ))}
      <ThemedText type="small">
        Dernier texte : {READING_TEXTS.find((t) => t.id === last.textId)?.title ?? '—'}
        {last.hardWords.length > 0
          ? ` · mots difficiles : ${last.hardWords.join(', ')}`
          : ' · aucun mot difficile'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  date: { width: 88 },
  track: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  bar: { height: '100%' },
});
