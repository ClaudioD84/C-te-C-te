import { addDays, formatShortDate, toIsoDate, type IsoDate } from '@cote-a-cote/shared';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface DayPickerProps {
  label: string;
  value: IsoDate | null;
  onChange: (value: IsoDate | null) => void;
  /** Nombre de jours proposés à partir d'aujourd'hui. */
  days?: number;
}

/** Choix d'un jour parmi les prochaines semaines, plus « sans date ». */
export function DayPicker({ label, value, onChange, days = 28 }: DayPickerProps) {
  const theme = useTheme();
  const today = toIsoDate(new Date());
  const options: (IsoDate | null)[] = [null, ...Array.from({ length: days }, (_, i) => addDays(today, i))];
  // Une date passée ou lointaine reste visible et sélectionnée.
  if (value && !options.includes(value)) options.splice(1, 0, value);

  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <ThemedText type="smallBold" importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option ?? 'none'}
              onPress={() => onChange(option)}
              accessibilityRole="radio"
              aria-checked={selected}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.primary : theme.backgroundElement,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText type="small" style={{ color: selected ? theme.onPrimary : theme.text }}>
                {option === null ? 'Sans date' : option === today ? "Aujourd'hui" : formatShortDate(option)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  row: { gap: Spacing.two },
  chip: {
    minHeight: MinTouchSize,
    paddingHorizontal: Spacing.three,
    borderRadius: MinTouchSize / 2,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
