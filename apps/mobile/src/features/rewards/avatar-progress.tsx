import type { RewardSummary } from '@cote-a-cote/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Avatar qui grandit avec l'effort, et progression vers le stade suivant. */
export function AvatarProgress({ summary, onPress }: { summary: RewardSummary; onPress?: () => void }) {
  const theme = useTheme();
  const remaining = summary.nextStage ? summary.nextStage.threshold - summary.points : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${summary.stage.name}, ${summary.points} points d'effort. Voir mes badges.`}
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={styles.emoji}>{summary.stage.emoji}</ThemedText>
      <View style={styles.text}>
        <ThemedText type="smallBold">{summary.stage.name}</ThemedText>
        <View
          style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
          accessibilityRole="progressbar"
          accessibilityLabel={
            summary.nextStage
              ? `Progression vers ${summary.nextStage.name.toLowerCase()}`
              : 'Plus grand stade atteint'
          }
          accessibilityValue={{ min: 0, max: 100, now: Math.round(summary.progress * 100) }}>
          <View
            style={[styles.bar, { width: `${summary.progress * 100}%`, backgroundColor: theme.primary }]}
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {summary.nextStage
            ? `Encore ${remaining} points d'effort pour devenir ${summary.nextStage.name.toLowerCase()}`
            : 'Tu as atteint le plus grand stade !'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  emoji: { fontSize: 44, lineHeight: 52 },
  text: { flex: 1, gap: Spacing.one },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  bar: { height: '100%' },
});
