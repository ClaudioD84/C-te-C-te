import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEPS = ['Je revois', 'Je m’entraîne', 'Je vérifie'] as const;

/** Les trois étapes d'une leçon, l'étape en cours mise en avant. */
export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const theme = useTheme();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`Étape ${current} sur 3 : ${STEPS[current - 1]!.toLowerCase()}`}>
      {STEPS.map((label, i) => {
        const active = i + 1 === current;
        const done = i + 1 < current;
        return (
          <View
            key={label}
            style={[
              styles.step,
              {
                backgroundColor: active ? theme.primary : theme.backgroundElement,
                borderColor: active || done ? theme.primary : theme.border,
              },
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: active ? theme.onPrimary : done ? theme.primary : theme.textSecondary }}>
              {done ? '✓' : `${i + 1} ·`} {label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  step: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    alignItems: 'center',
  },
});
