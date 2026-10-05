import { currentHoliday, formatShortDate, toIsoDate, type LearningSettings } from '@cote-a-cote/shared';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useDaysOff } from '@/features/days-off/api';

/** Console enfant : message de vacances pendant un congé scolaire. */
export function HolidayBanner({ childId, settings }: { childId: string; settings: LearningSettings }) {
  const daysOff = useDaysOff(childId);
  const holiday = currentHoliday(daysOff.data ?? [], toIsoDate(new Date()));
  if (!holiday) return null;
  return (
    <ThemedView type="backgroundSelected" style={styles.card}>
      <ThemedText type="subtitle">🏖️ C’est les vacances !</ThemedText>
      <ThemedText style={learningTextStyle(settings)}>
        Jusqu’au {formatShortDate(holiday.end)}. Repose-toi et profite bien. Si tu en as envie, quelques
        cartes à revoir t’attendent, sans obligation.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
});
