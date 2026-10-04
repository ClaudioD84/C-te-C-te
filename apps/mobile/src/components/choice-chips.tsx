import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ChoiceChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  onToggle: (value: T) => void;
  /** Lecteur d'écran : choix unique (radio) ou multiple (case à cocher). */
  multiple?: boolean;
}

export function ChoiceChips<T extends string>({
  label,
  options,
  labels,
  selected,
  onToggle,
  multiple,
}: ChoiceChipsProps<T>) {
  const theme = useTheme();
  return (
    <View
      style={styles.container}
      accessibilityRole={multiple ? undefined : 'radiogroup'}
      accessibilityLabel={label}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={multiple ? { checked: isSelected } : { selected: isSelected }}
              onPress={() => onToggle(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText type="small" style={{ color: isSelected ? theme.onPrimary : theme.text }}>
                {labels[option]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: MinTouchSize,
    minWidth: MinTouchSize,
    paddingHorizontal: Spacing.three,
    borderRadius: MinTouchSize / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
