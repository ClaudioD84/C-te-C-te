import { CHILD_LIMITS } from '@cote-a-cote/shared';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useBuyOffer, useOffers, useRestorePurchases, useSubscription } from '@/features/subscription/api';
import { billingMode, MANAGE_SUBSCRIPTIONS_URL, type Offer } from '@/features/subscription/billing';

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL;
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

/** Abonnement (F13) : état actuel, formules, restauration des achats. */
export default function SubscriptionScreen() {
  const subscription = useSubscription();
  const offers = useOffers();
  const buy = useBuyOffer();
  const restore = useRestorePurchases();
  const [message, setMessage] = useState<string | null>(null);

  const summary = subscription.summary;
  const current = subscription.data;
  const paid = current && current.plan !== 'essai' && summary?.active;

  async function choose(offer: Offer) {
    setMessage(null);
    try {
      const { result, confirmed } = await buy.mutateAsync(offer);
      if (result === 'annule') return;
      setMessage(
        confirmed
          ? `Merci ! La formule ${offer.title} est active.`
          : 'Paiement reçu. L’activation peut prendre une minute : revenez sur cet écran dans un instant.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Le paiement n’a pas abouti.');
    }
  }

  async function runRestore() {
    setMessage(null);
    try {
      const found = await restore.mutateAsync();
      setMessage(
        found ? 'Achats restaurés.' : 'Aucun abonnement trouvé pour ce compte App Store ou Google Play.',
      );
    } catch {
      setMessage('La restauration a échoué. Réessayez.');
    }
  }

  return (
    <Screen>
      {summary ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{summary.title}</ThemedText>
          <ThemedText themeColor={summary.urgent ? 'warning' : 'textSecondary'}>{summary.detail}</ThemedText>
        </ThemedView>
      ) : (
        <ActivityIndicator />
      )}

      {paid && current?.store && current.store !== 'simulation' && billingMode === 'store' ? (
        <Button
          variant="secondary"
          label="Gérer ou résilier mon abonnement"
          onPress={() => WebBrowser.openBrowserAsync(MANAGE_SUBSCRIPTIONS_URL)}
        />
      ) : null}

      <ThemedText type="subtitle">Les formules</ThemedText>
      {billingMode === 'indisponible' ? (
        <ThemedText themeColor="textSecondary">
          L’abonnement se souscrit dans l’application installée depuis l’App Store ou Google Play.
        </ThemedText>
      ) : null}
      {billingMode === 'simulation' ? (
        <ThemedText themeColor="warning">Mode simulé : aucun paiement réel (version de test).</ThemedText>
      ) : null}
      {offers.isLoading ? <ActivityIndicator /> : null}
      {offers.error ? (
        <ThemedText themeColor="danger">
          Impossible de charger les formules. Vérifiez votre connexion.
        </ThemedText>
      ) : null}

      {(offers.data ?? []).map((offer) => {
        const isCurrent = paid && current?.plan === offer.plan;
        return (
          <ThemedView key={offer.key} type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{offer.title}</ThemedText>
            <ThemedText>{offer.priceLabel}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {offer.children === 1 ? '1 enfant' : `Jusqu’à ${offer.children} enfants`} · photos du journal de
              classe, fiches, quiz et dossiers de révision
            </ThemedText>
            {billingMode !== 'indisponible' ? (
              <Button
                label={isCurrent ? 'Formule actuelle' : 'Choisir'}
                accessibilityLabel={
                  isCurrent ? `${offer.title} : formule actuelle` : `Choisir la formule ${offer.title}`
                }
                disabled={Boolean(isCurrent) || buy.isPending}
                loading={buy.isPending && buy.variables?.key === offer.key}
                onPress={() => choose(offer)}
              />
            ) : null}
          </ThemedView>
        );
      })}

      {message ? (
        <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">
          {message}
        </ThemedText>
      ) : null}

      {billingMode === 'store' ? (
        <Button
          variant="secondary"
          label="Restaurer mes achats"
          loading={restore.isPending}
          onPress={runRestore}
        />
      ) : null}

      <View style={styles.legal}>
        <ThemedText type="small" themeColor="textSecondary">
          Les abonnements (mensuels ou annuels) se renouvellent automatiquement, sauf résiliation au moins 24
          heures avant la fin de la période, depuis les réglages de votre compte App Store ou Google Play. Le
          paiement est débité sur ce compte. La formule Solo concerne {CHILD_LIMITS.solo} enfant, la formule
          Famille jusqu’à {CHILD_LIMITS.famille} enfants.
        </ThemedText>
        {TERMS_URL ? (
          <Button
            variant="secondary"
            label="Conditions d’utilisation"
            onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
          />
        ) : null}
        {PRIVACY_URL ? (
          <Button
            variant="secondary"
            label="Politique de confidentialité"
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  legal: { gap: Spacing.two },
});
