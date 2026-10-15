import type { LearningSettings } from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';

import { useMarkNoteSeen, useUnreadNote } from './api';

/** Console enfant : le petit mot du parent, à lire ou à écouter. */
export function NoteCard({ childId, settings }: { childId: string; settings: LearningSettings }) {
  const note = useUnreadNote(childId);
  const markSeen = useMarkNoteSeen(childId);
  if (!note.data) return null;
  const message = note.data.message;
  return (
    <ThemedView type="backgroundSelected" style={styles.card} accessibilityLiveRegion="polite">
      <ThemedText type="subtitle">💌 Un petit mot pour toi</ThemedText>
      <ThemedText style={learningTextStyle(settings)}>{message}</ThemedText>
      <View style={styles.row}>
        <Button
          variant="secondary"
          label="Écouter le mot"
          style={styles.flex}
          onPress={() => Speech.speak(message, { language: 'fr-BE' })}
        />
        <Button label="Merci !" style={styles.flex} onPress={() => markSeen.mutate(note.data!.id)} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
