import { PARENT_CODE_LENGTH } from '@cote-a-cote/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'effacer'] as const;

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  /** Appelé quand le code atteint sa longueur complète. */
  onComplete: (value: string) => void;
  disabled?: boolean;
}

export function PinPad({ value, onChange, onComplete, disabled }: PinPadProps) {
  const theme = useTheme();

  function press(key: (typeof KEYS)[number]) {
    if (key === 'effacer') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= PARENT_CODE_LENGTH) return;
    const next = value + key;
    onChange(next);
    if (next.length === PARENT_CODE_LENGTH) onComplete(next);
  }

  return (
    <View style={styles.container}>
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={`${value.length} chiffres saisis sur ${PARENT_CODE_LENGTH}`}>
        {Array.from({ length: PARENT_CODE_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: theme.primary, backgroundColor: i < value.length ? theme.primary : 'transparent' },
            ]}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              disabled={disabled}
              onPress={() => press(key)}
              accessibilityRole="button"
              accessibilityLabel={key === 'effacer' ? 'Effacer le dernier chiffre' : key}
              style={({ pressed }) => [
                styles.key,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, opacity: disabled ? 0.5 : 1 },
              ]}>
              <ThemedText type={key === 'effacer' ? 'small' : 'subtitle'}>{key === 'effacer' ? '⌫' : key}</ThemedText>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.four },
  dots: { flexDirection: 'row', gap: Spacing.three },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  grid: { width: KEY_SIZE * 3 + Spacing.three * 2, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  key: { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
});
