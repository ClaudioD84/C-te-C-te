import { BADGES, formatShortDate, type BadgeCode } from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { useRewards } from '@/features/rewards/api';
import { AccessoryPicker } from '@/features/rewards/accessory-picker';
import { AvatarProgress } from '@/features/rewards/avatar-progress';

/** Badges de l'enfant : ceux gagnés, et ceux à découvrir (jamais perdus). */
export default function BadgesScreen() {
  const { activeChildId } = useChildMode();
  const child = useChildProfile(activeChildId ?? '');
  const { summary } = useRewards(activeChildId ?? '', child.data?.preferences.availableDays);

  if (!summary) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const earned = new Map(summary.badges.map((b) => [b.code, b.earnedOn]));

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AvatarProgress summary={summary} />
        <ThemedText themeColor="textSecondary">
          {summary.effortDaysThisWeek} jour{summary.effortDaysThisWeek > 1 ? 's' : ''} de travail cette
          semaine
          {summary.currentStreak > 1 ? ` · série de ${summary.currentStreak} jours` : ''}
        </ThemedText>
        {child.data ? <AccessoryPicker child={child.data} summary={summary} /> : null}
        {(Object.keys(BADGES) as BadgeCode[]).map((code) => {
          const badge = BADGES[code];
          const date = earned.get(code);
          return (
            <ThemedView
              key={code}
              type="backgroundElement"
              // Badge à découvrir : seul le pictogramme est estompé, le texte reste bien lisible.
              style={styles.badge}
              accessible
              accessibilityLabel={`${badge.title}. ${badge.description} ${date ? 'Gagné.' : 'À découvrir.'}`}>
              <ThemedText style={[styles.emoji, !date && styles.locked]}>
                {date ? badge.emoji : '🔒'}
              </ThemedText>
              <View style={styles.text}>
                <ThemedText type="smallBold">{badge.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {badge.description}
                  {date ? ` Gagné le ${formatShortDate(date)}.` : ' À découvrir.'}
                </ThemedText>
              </View>
            </ThemedView>
          );
        })}
        <Button label="Retour à la mission" onPress={() => router.back()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  locked: { opacity: 0.55 },
  emoji: { fontSize: 32, lineHeight: 40 },
  text: { flex: 1, gap: Spacing.half },
});
