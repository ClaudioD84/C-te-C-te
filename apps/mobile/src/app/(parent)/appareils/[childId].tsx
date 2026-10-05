import { formatShortDate } from '@cote-a-cote/shared';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { QrCode } from '@/components/qr-code';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  formatPairingCode,
  useChildDevices,
  useCreatePairingCode,
  useRemoveDevice,
} from '@/features/devices/api';
import { useChildProfile } from '@/features/profiles/api';

const CODE_MINUTES = 15;

/** Tablette de l'enfant : la relier par un code ou un QR code, voir et retirer les tablettes reliées. */
export default function ChildDevicesScreen() {
  const { childId = '' } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const devices = useChildDevices(childId);
  const createCode = useCreatePairingCode(childId);
  const remove = useRemoveDevice(childId);
  const [pairing, setPairing] = useState<{ code: string; until: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Tant qu'un code est affiché, on guette l'arrivée de la tablette et l'expiration du code.
  const refetchDevices = devices.refetch;
  useEffect(() => {
    if (!pairing) return;
    const id = setInterval(() => {
      setNow(Date.now());
      void refetchDevices();
    }, 3000);
    return () => clearInterval(id);
  }, [pairing, refetchDevices]);

  const count = devices.data?.length ?? 0;
  const [initialCount, setInitialCount] = useState<number | null>(null);
  const [paired, setPaired] = useState(false);
  // La tablette est arrivée : le code, consommé, n'est plus affiché.
  if (pairing !== null && initialCount !== null && count > initialCount) {
    setPairing(null);
    setInitialCount(null);
    setPaired(true);
  }
  const expired = pairing !== null && now > pairing.until;

  async function newCode() {
    setPaired(false);
    setInitialCount(count);
    const code = await createCode.mutateAsync();
    setNow(Date.now());
    setPairing({ code, until: Date.now() + CODE_MINUTES * 60 * 1000 });
  }

  if (!child.data || devices.isLoading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }
  const alias = child.data.alias;

  return (
    <Screen>
      <ThemedText type="subtitle">Tablette de {alias}</ThemedText>
      <ThemedText themeColor="textSecondary">
        Une tablette reliée n’affiche que la console de {alias} : mission du jour, fiches, cartes et badges.
        Elle n’a pas accès à l’espace parent ni aux autres enfants.
      </ThemedText>

      {pairing && !expired ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText>
            Sur la tablette, ouvrez Côte à Côte puis « Relier la tablette de mon enfant », et recopiez ce
            code. Ou scannez le QR code avec l’appareil photo de la tablette.
          </ThemedText>
          <ThemedText
            type="title"
            style={styles.code}
            accessibilityLabel={`Code ${pairing.code.split('').join(' ')}`}>
            {formatPairingCode(pairing.code)}
          </ThemedText>
          <QrCode
            value={Linking.createURL('appareil', { queryParams: { code: pairing.code } })}
            label="QR code de liaison de la tablette"
          />
          <ThemedText type="small" themeColor="textSecondary">
            Valable {Math.max(1, Math.ceil((pairing.until - now) / 60000))} min, une seule fois.
          </ThemedText>
          <Button variant="secondary" label="Annuler" onPress={() => setPairing(null)} />
        </ThemedView>
      ) : null}

      {paired ? (
        <ThemedView type="backgroundSelected" style={styles.card} accessibilityLiveRegion="polite">
          <ThemedText>La tablette est reliée. Elle affiche maintenant la console de {alias}.</ThemedText>
          <Button label="Terminé" onPress={() => setPaired(false)} />
        </ThemedView>
      ) : null}

      {!pairing || expired ? (
        <>
          {expired ? (
            <ThemedText themeColor="textSecondary">Le code a expiré. Demandez-en un nouveau.</ThemedText>
          ) : null}
          <Button label="Relier une tablette" loading={createCode.isPending} onPress={newCode} />
        </>
      ) : null}
      {createCode.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {createCode.error.message}
        </ThemedText>
      ) : null}

      <ThemedText type="smallBold" themeColor="textSecondary">
        Tablettes reliées
      </ThemedText>
      {count === 0 ? <ThemedText themeColor="textSecondary">Aucune pour l’instant.</ThemedText> : null}
      {devices.data?.map((device) => (
        <ThemedView key={device.user_id} type="backgroundElement" style={styles.card}>
          <View>
            <ThemedText type="smallBold">{device.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Reliée le {formatShortDate(device.created_at.slice(0, 10))} · utilisée le{' '}
              {formatShortDate(device.last_seen_at.slice(0, 10))}
            </ThemedText>
          </View>
          <Button
            variant="secondary"
            label="Retirer"
            accessibilityLabel={`Retirer ${device.name}`}
            loading={remove.isPending && remove.variables === device.user_id}
            onPress={() => remove.mutate(device.user_id)}
          />
        </ThemedView>
      ))}
      {remove.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          Le retrait a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  code: { textAlign: 'center', letterSpacing: 4 },
});
