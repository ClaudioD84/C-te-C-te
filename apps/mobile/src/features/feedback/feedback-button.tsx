import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { screenName } from '@/features/monitoring/report-error';

/** Bouton d'en-tête des écrans parent : un avis en deux gestes, avec l'écran d'où il est donné. */
export function FeedbackButton() {
  const pathname = usePathname();
  if (pathname === '/avis') return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Donner mon avis"
      hitSlop={Spacing.two}
      style={styles.button}
      onPress={() => router.push({ pathname: '/avis', params: { depuis: screenName(pathname) } })}>
      <ThemedText>💬</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: Spacing.two },
});
