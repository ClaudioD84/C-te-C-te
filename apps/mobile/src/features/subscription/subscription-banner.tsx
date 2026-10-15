import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { useSubscription } from './api';

/** Cockpit : rappel de l'essai, d'un paiement refusé ou d'un accès fermé. */
export function SubscriptionBanner() {
  const { summary } = useSubscription();
  if (!summary || (!summary.urgent && summary.kind !== 'essai')) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" themeColor={summary.urgent ? 'warning' : 'text'}>
        {summary.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {summary.detail}
      </ThemedText>
      <Link href="/abonnement" asChild>
        <Button variant={summary.urgent ? 'primary' : 'secondary'} label="Voir les formules" />
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
