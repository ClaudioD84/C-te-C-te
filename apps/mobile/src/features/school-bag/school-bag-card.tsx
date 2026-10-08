import { bagDay, bagItemsFor, WEEKDAY_LABELS, weekdayKey, type LearningSettings } from '@cote-a-cote/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useBagChecks, useSchoolBag } from './api';

/** Sur la console : « Mon cartable pour demain », à cocher. */
export function SchoolBagCard({ childId, settings }: { childId: string; settings: LearningSettings }) {
  const theme = useTheme();
  const [target] = useState(() => bagDay(new Date()));
  const bag = useSchoolBag(childId);
  const { checked, toggle } = useBagChecks(childId, target?.date ?? '');
  if (!target || !bag.data) return null;
  const items = bagItemsFor(bag.data, target.date);
  if (items.length === 0) return null;
  const done = items.every((item) => checked.includes(item.id));
  const day = WEEKDAY_LABELS[weekdayKey(target.date)].toLowerCase();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        🎒 Mon cartable pour {target.when === 'demain' ? `demain (${day})` : `aujourd’hui (${day})`}
      </ThemedText>
      {items.map((item) => {
        const isChecked = checked.includes(item.id);
        return (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            aria-checked={isChecked}
            accessibilityLabel={item.label}
            onPress={() => toggle(item.id)}
            style={styles.row}>
            <View
              style={[
                styles.box,
                { borderColor: theme.border, backgroundColor: isChecked ? theme.primary : 'transparent' },
              ]}>
              {isChecked ? <ThemedText style={{ color: theme.onPrimary }}>✓</ThemedText> : null}
            </View>
            <ThemedText style={[learningTextStyle(settings), isChecked && styles.done]}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
      {done ? (
        <ThemedText type="smallBold" themeColor="primary" accessibilityLiveRegion="polite">
          Cartable prêt ✓
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: MinTouchSize },
  box: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { textDecorationLine: 'line-through' },
});
