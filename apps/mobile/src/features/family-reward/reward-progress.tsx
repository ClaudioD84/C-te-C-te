import type { LearningSettings } from '@cote-a-cote/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useFamilyReward } from './api';

/** Console enfant : la récompense choisie avec le parent et les missions qu'il reste. */
export function RewardProgress({ childId, settings }: { childId: string; settings: LearningSettings }) {
  const theme = useTheme();
  const reward = useFamilyReward(childId);
  if (!reward.data) return null;
  const { reward: r, done } = reward.data;
  const won = done >= r.missions_needed;
  return (
    <ThemedView type={won ? 'backgroundSelected' : 'backgroundElement'} style={styles.card}>
      <ThemedText style={learningTextStyle(settings)} accessibilityLiveRegion="polite">
        {won
          ? `🎉 Tu as gagné : ${r.label} ! Montre cet écran à ton parent.`
          : `🎁 Ta récompense : ${r.label} · ${done} mission${done > 1 ? 's' : ''} sur ${r.missions_needed}`}
      </ThemedText>
      <View
        style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
        accessibilityRole="progressbar"
        accessibilityLabel="Missions vers la récompense"
        accessibilityValue={{ min: 0, max: r.missions_needed, now: done }}>
        <View
          style={[
            styles.bar,
            { width: `${(done / r.missions_needed) * 100}%`, backgroundColor: theme.accent },
          ]}
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
