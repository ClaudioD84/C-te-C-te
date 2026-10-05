import { deriveLearningSettings } from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { useSpellingList } from '@/features/spelling/api';
import { DictationPlayer } from '@/features/study/dictation-player';
import { useLogPractice } from '@/features/study/api';

/** Entraînement à la dictée préparée de la semaine. */
export default function SpellingScreen() {
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  const list = useSpellingList(childId);
  const logPractice = useLogPractice(childId);

  if (!child.data || list.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Ma dictée de la semaine</ThemedText>
        {list.data && list.data.length > 0 ? (
          <DictationPlayer
            words={list.data}
            subject="Français"
            settings={deriveLearningSettings(child.data)}
            onFinish={(correct, total) => logPractice('dictee', 'Français', correct, total)}
          />
        ) : (
          <ThemedText>Pas encore de mots cette semaine.</ThemedText>
        )}
        <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
});
