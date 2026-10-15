import { deriveLearningSettings, formatShortDate } from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { useLogReading, useReadingLog } from '@/features/reading/api';

const DURATIONS = ['5', '10', '15', '20', '30'] as const;

/** Carnet de lecture : l'enfant note ses lectures ; chaque lecture compte comme un effort. */
export default function ReadingScreen() {
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  const log = useReadingLog(childId);
  const logReading = useLogReading(childId);
  const [minutes, setMinutes] = useState<(typeof DURATIONS)[number]>('15');
  const [book, setBook] = useState('');
  const [saved, setSaved] = useState(false);

  if (!child.data || log.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  const text = learningTextStyle(deriveLearningSettings(child.data));
  const entries = log.data ?? [];
  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  const books = [...new Set(entries.map((e) => e.book).filter((b): b is string => Boolean(b)))];

  return (
    <ChildScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">📚 Mon carnet de lecture</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ChoiceChips
            label="J’ai lu pendant…"
            options={DURATIONS}
            labels={Object.fromEntries(DURATIONS.map((d) => [d, `${d} min`])) as Record<string, string>}
            selected={[minutes]}
            onToggle={(d) => {
              setMinutes(d);
              setSaved(false);
            }}
          />
          <TextField
            label="Mon livre (facultatif)"
            value={book}
            onChangeText={(t) => {
              setBook(t);
              setSaved(false);
            }}
            maxLength={60}
          />
          <Button
            label="J’ai lu !"
            disabled={saved}
            onPress={() => {
              logReading(Number(minutes), book);
              setSaved(true);
            }}
          />
          {saved ? (
            <ThemedText style={text} accessibilityLiveRegion="polite">
              Bravo ! C’est noté dans ton carnet.
            </ThemedText>
          ) : null}
        </ThemedView>

        {entries.length > 0 ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              {total} minutes de lecture · {entries.length} fois
              {books.length > 0 ? ` · ${books.length} livre${books.length > 1 ? 's' : ''}` : ''}
            </ThemedText>
            {entries.slice(0, 10).map((e) => (
              <View key={e.id} style={styles.row}>
                <ThemedText style={styles.flex}>{e.book ?? 'Lecture'}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {e.minutes} min · {formatShortDate(e.date)}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        ) : null}
        <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />
      </ScrollView>
    </ChildScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
