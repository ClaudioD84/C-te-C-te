import { formatShortDate, type WeekEffort } from '@cote-a-cote/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CHART_HEIGHT = 120;

/**
 * Minutes de travail par semaine : une seule série, une seule teinte, barres fines
 * arrondies en haut, valeur affichée pour la semaine touchée (par défaut la plus récente).
 */
export function WeeklyChart({ weeks }: { weeks: WeekEffort[] }) {
  const theme = useTheme();
  const [selected, setSelected] = useState(weeks.length - 1);
  const max = Math.max(30, ...weeks.map((w) => w.minutes));
  const current = weeks[selected];

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
        {current
          ? `Semaine du ${formatShortDate(current.weekStart)} : ${current.minutes} min, ${current.activities} activité${current.activities > 1 ? 's' : ''}, ${current.cards} carte${current.cards > 1 ? 's' : ''}`
          : ''}
      </ThemedText>
      <View style={[styles.plot, { borderBottomColor: theme.border }]}>
        {weeks.map((week, i) => {
          const height = week.minutes === 0 ? 0 : Math.max(4, (week.minutes / max) * CHART_HEIGHT);
          return (
            <Pressable
              key={week.weekStart}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityLabel={`Semaine du ${formatShortDate(week.weekStart)} : ${week.minutes} minutes`}
              accessibilityState={{ selected: i === selected }}
              style={styles.hit}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: theme.primary,
                    opacity: i === selected ? 1 : 0.55,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        <ThemedText type="small" themeColor="textSecondary">
          {weeks[0] ? formatShortDate(weeks[0].weekStart) : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Cette semaine
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  plot: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Zone tactile plus large que la barre.
  hit: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
