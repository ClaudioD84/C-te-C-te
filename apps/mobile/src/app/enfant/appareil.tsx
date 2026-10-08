import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { unlinkThisDevice } from '@/features/devices/api';
import { useChildProfile } from '@/features/profiles/api';

/** Réglages de la tablette de l'enfant : la délier (à faire avec le parent). */
export default function ChildDeviceScreen() {
  const { activeChildId } = useChildMode();
  const child = useChildProfile(activeChildId ?? '');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function unlink() {
    setBusy(true);
    setMessage(null);
    try {
      await unlinkThisDevice();
    } catch (error) {
      setMessage((error as Error).message);
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Cette tablette</ThemedText>
      <ThemedText>
        Elle est reliée au profil {child.data ? `de ${child.data.alias}` : 'de votre enfant'} et n’affiche que
        sa console. Le parent gère le profil depuis son propre téléphone.
      </ThemedText>
      {confirming ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText>
            La tablette ne sera plus reliée : il faudra un nouveau code du parent pour l’utiliser à nouveau.
            Le travail déjà fait est conservé.
          </ThemedText>
          <Button label="Oui, délier cette tablette" loading={busy} onPress={unlink} />
          <Button variant="secondary" label="Annuler" onPress={() => setConfirming(false)} />
        </ThemedView>
      ) : (
        <Button variant="secondary" label="Délier cette tablette" onPress={() => setConfirming(true)} />
      )}
      {message ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {message}
        </ThemedText>
      ) : null}
      <Button label="Retour à la mission" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
