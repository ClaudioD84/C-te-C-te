import { deriveLearningSettings } from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { PomodoroTimer } from '@/features/mission/pomodoro-timer';
import { useChildProfile } from '@/features/profiles/api';

/** Console enfant : uniquement la mission du jour, sans menu. */
export default function ChildConsoleScreen() {
  const { activeChildId } = useChildMode();
  const { data: child, isLoading, error, refetch } = useChildProfile(activeChildId ?? '');

  const parentButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Espace parent (code demandé)"
      onPress={() => router.push('/enfant/code')}
      style={styles.parentButton}>
      <ThemedText type="small" themeColor="textSecondary">
        Parent
      </ThemedText>
    </Pressable>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !child) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>Impossible de charger la mission.</ThemedText>
        <Button label="Réessayer" onPress={() => refetch()} />
        {parentButton}
      </ThemedView>
    );
  }

  const settings = deriveLearningSettings(child);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Bonjour {child.alias} !</ThemedText>
        {parentButton}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six, gap: Spacing.four },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  parentButton: {
    minHeight: MinTouchSize,
    minWidth: MinTouchSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mission: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
});
