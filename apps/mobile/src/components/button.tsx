import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  size?: 'normal' | 'large';
};

export function Button({
  label,
  variant = 'primary',
  loading,
  size = 'normal',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        size === 'large' && styles.large,
        {
          backgroundColor: primary ? theme.primary : theme.backgroundElement,
          borderColor: primary ? theme.primary : theme.border,
          opacity: disabled ? 0.5 : state.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={primary ? theme.onPrimary : theme.text} />
      ) : (
        <ThemedText
          type={size === 'large' ? 'subtitle' : 'smallBold'}
          style={{ color: primary ? theme.onPrimary : theme.text, textAlign: 'center' }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MinTouchSize,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    minHeight: 96,
    borderRadius: Spacing.four,
  },
});
