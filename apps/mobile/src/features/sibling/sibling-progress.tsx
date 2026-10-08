import type { LearningSettings } from '@cote-a-cote/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useSiblingChallenge } from './api';

/** Console enfant : le défi commun de la fratrie (le total de tous, jamais le détail par enfant). */
export function SiblingProgress({ settings }: { settings: LearningSettings }) {
  const theme = useTheme();
  const challenge = useSiblingChallenge();
  if (!challenge.data) return null;
  const { label, missionsNeeded, done } = challenge.data;
  const won = done >= missionsNeeded;
  return (
    <ThemedView type={won ? 'backgroundSelected' : 'backgroundElement'} style={styles.card}>
      <ThemedText style={learningTextStyle(settings)} accessibilityLiveRegion="polite">
        {won
          ? `🎉 Défi de la fratrie réussi : ${label} ! Bravo à vous tous.`
          : `🤝 Défi de la fratrie : ${done} mission${done > 1 ? 's' : ''} sur ${missionsNeeded} à vous tous · ${label}`}
      </ThemedText>
      <View
        style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
        accessibilityRole="progressbar"
        accessibilityLabel="Missions de la fratrie"
        accessibilityValue={{ min: 0, max: missionsNeeded, now: done }}>
        <View
          style={[styles.bar, { width: `${(done / missionsNeeded) * 100}%`, backgroundColor: theme.primary }]}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  bar: { height: '100%' },
});
