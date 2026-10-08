import { onlineManager, useMutationState } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Vrai quand l'appareil a du réseau (selon le système, ou le navigateur sur le web). */
export function useIsOnline() {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}

/** Nombre d'actions en attente d'envoi (activités cochées, cartes, quiz). */
export function usePendingCount() {
  return useMutationState({ filters: { status: 'pending' } }).length;
}

/**
 * Bandeau discret : hors connexion, ou actions encore en attente d'envoi.
 * `audience` adapte le ton (l'enfant est tutoyé, le parent vouvoyé).
 */
export function OfflineBanner({ audience }: { audience: 'enfant' | 'parent' }) {
  const online = useIsOnline();
  const pending = usePendingCount();
  if (online && pending === 0) return null;

  const child = audience === 'enfant';
  const message = !online
    ? child
      ? 'Pas de connexion. Tu peux continuer : ce que tu fais sera envoyé plus tard.'
      : 'Hors connexion : les données affichées peuvent dater un peu.'
    : child
      ? 'J’envoie ce que tu as fait…'
      : `Envoi de ${pending} action${pending > 1 ? 's' : ''} faite${pending > 1 ? 's' : ''} hors connexion…`;

  return (
    <ThemedView
      type="backgroundElement"
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <ThemedText type="small">{message}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Spacing.three },
});
