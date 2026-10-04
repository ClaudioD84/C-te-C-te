import { deriveLearningSettings } from '@cote-a-cote/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { PomodoroTimer } from '@/features/mission/pomodoro-timer';
import { useChildProfile } from '@/features/profiles/api';

/**
 * Console enfant : uniquement la mission du jour, sans menu.
 * Le retour au cockpit demande un appui long pour éviter les sorties accidentelles
 * (le code parent sera ajouté avec l'écran de réglages).
 */
export default function ChildConsoleScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data: child, isLoading } = useChildProfile(childId);

  if (isLoading || !child) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const settings = deriveLearningSettings(child);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Bonjour {child.alias} !</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour à l'espace parent (appui long)"
          onLongPress={() => router.back()}
          delayLongPress={1500}
          style={styles.parentButton}>
          <ThemedText type="small" themeColor="textSecondary">
            Parent
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView type="backgroundElement" style={styles.mission}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Mission du jour
        </ThemedText>
        <ThemedText
          style={{
            fontSize: 20 * settings.fontScale,
            lineHeight: 20 * settings.fontScale * settings.lineHeight,
            letterSpacing: 20 * settings.fontScale * settings.letterSpacing,
          }}>
          Pas encore de mission. Demande à ton parent de photographier ton journal de classe !
        </ThemedText>
      </ThemedView>

      <PomodoroTimer workMinutes={settings.workMinutes} breakMinutes={settings.breakMinutes} cycles={2} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six, gap: Spacing.four },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parentButton: { minHeight: MinTouchSize, minWidth: MinTouchSize, justifyContent: 'center', alignItems: 'center' },
  mission: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
});
