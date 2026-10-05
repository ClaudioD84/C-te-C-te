import { DOCUMENT_TYPES, findSensitiveBoxes, type Box, type DocumentType } from '@cote-a-cote/shared';
import * as ImagePicker from 'expo-image-picker';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { submitScan, useFamilyId } from '@/features/scan/api';
import { prepareImage, type PreparedImage } from '@/features/scan/image';
import { MaskEditor } from '@/features/scan/mask-editor';
import { recognizeWords } from '@/features/scan/ocr';
import { getSensitiveNames } from '@/features/scan/sensitive-names';

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  journal_de_classe: 'Journal de classe',
  notes_de_cours: 'Notes de cours',
  interrogation: 'Interrogation',
};

interface Detection {
  /** null : reconnaissance de texte indisponible sur cet appareil. */
  found: number | null;
  namesConfigured: boolean;
}

export default function NewScanScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data: familyId } = useFamilyId();
  const [documentType, setDocumentType] = useState<DocumentType>('journal_de_classe');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [busy, setBusy] = useState<'preparation' | 'envoi' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function pick(source: 'camera' | 'galerie') {
    setMessage(null);
    // La galerie passe par le sélecteur du système : aucun accès à toute la photothèque n'est demandé.
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : { granted: true };
    if (!permission.granted) {
      setMessage("L'accès a été refusé. Vous pouvez l'autoriser dans les réglages du téléphone.");
      return;
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    setBusy('preparation');
    try {
      const prepared = await prepareImage(asset.uri, asset.width, asset.height);
      const [words, names] = await Promise.all([recognizeWords(prepared.uri), getSensitiveNames()]);
      const found = words ? findSensitiveBoxes(words, names, prepared.width, prepared.height) : [];
      setImage(prepared);
      setBoxes(found);
      setDetection({ found: words ? found.length : null, namesConfigured: names.length > 0 });
    } catch {
      setMessage("La photo n'a pas pu être préparée. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!image || !familyId) return;
    setBusy('envoi');
    setMessage(null);
    try {
      const scanId = await submitScan({ familyId, childId, documentType, image, boxes });
      router.replace({ pathname: '/scan/[scanId]', params: { scanId } });
    } catch {
      setMessage("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
      setBusy(null);
    }
  }

  if (busy === 'preparation') {
    return (
      <Screen>
        <ActivityIndicator />
        <ThemedText style={styles.center}>Préparation de la photo et recherche des noms…</ThemedText>
      </Screen>
    );
  }

  if (!image) {
    return (
      <Screen>
        <ChoiceChips
          label="Que photographiez-vous ?"
          options={DOCUMENT_TYPES}
          labels={DOCUMENT_LABELS}
          selected={[documentType]}
          onToggle={setDocumentType}
        />
        <ThemedText themeColor="textSecondary">
          Photographiez une page à la fois, à plat et bien éclairée. Une page de journal peut contenir
          plusieurs jours.
        </ThemedText>
        <Button label="Prendre une photo" onPress={() => pick('camera')} />
        <Button variant="secondary" label="Choisir dans la galerie" onPress={() => pick('galerie')} />
        {message ? <ThemedText themeColor="danger">{message}</ThemedText> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="smallBold">Masquez les informations personnelles</ThemedText>
      <DetectionNotice detection={detection} />
      <ThemedText type="small" themeColor="textSecondary">
        Glissez le doigt pour masquer une zone. Touchez une zone noire pour l&apos;enlever.
      </ThemedText>

      <MaskEditor image={image} boxes={boxes} onChange={setBoxes} />

      {message ? <ThemedText themeColor="danger">{message}</ThemedText> : null}
      <Button label="Envoyer pour analyse" onPress={send} loading={busy === 'envoi'} disabled={!familyId} />
      <View style={styles.row}>
        <Button
          variant="secondary"
          label="Autre photo"
          style={styles.flex}
          onPress={() => {
            setImage(null);
            setBoxes([]);
          }}
        />
        <Button
          variant="secondary"
          label="Effacer les zones"
          style={styles.flex}
          onPress={() => setBoxes([])}
        />
      </View>
    </Screen>
  );
}

function DetectionNotice({ detection }: { detection: Detection | null }) {
  if (!detection) return null;
  if (detection.found === null) {
    return (
      <ThemedText>
        Le masquage automatique n&apos;est pas disponible sur cet appareil : tracez les zones à la main.
      </ThemedText>
    );
  }
  if (!detection.namesConfigured) {
    return (
      <ThemedText>
        Aucun nom à masquer n&apos;est enregistré.{' '}
        <Link href="/noms-a-masquer">
          <ThemedText themeColor="primary">Les ajouter</ThemedText>
        </Link>
      </ThemedText>
    );
  }
  return (
    <ThemedText>
      {detection.found === 0
        ? 'Aucun nom trouvé automatiquement. Vérifiez la photo.'
        : `${detection.found} nom${detection.found > 1 ? 's' : ''} masqué${detection.found > 1 ? 's' : ''} automatiquement. Vérifiez qu'il n'en manque pas.`}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
