import { DOCUMENT_TYPES, type DocumentType } from '@cote-a-cote/shared';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { submitScan, useFamilyId } from '@/features/scan/api';
import { prepareImage, type PreparedImage } from '@/features/scan/image';

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  journal_de_classe: 'Journal de classe',
  notes_de_cours: 'Notes de cours',
  interrogation: 'Interrogation',
};

export default function NewScanScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { data: familyId } = useFamilyId();
  const [documentType, setDocumentType] = useState<DocumentType>('journal_de_classe');
  const [image, setImage] = useState<PreparedImage | null>(null);
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
      setImage(await prepareImage(asset.uri, asset.width, asset.height));
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
      const scanId = await submitScan({ familyId, childId, documentType, image });
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
        <ThemedText style={styles.center}>Préparation de la photo…</ThemedText>
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
      <ThemedText type="smallBold">Vérifiez la photo</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        La page doit être lisible. Elle est envoyée telle quelle pour l&apos;analyse, puis vous relisez la
        liste des devoirs.
      </ThemedText>

      <View accessible accessibilityRole="image" accessibilityLabel="Photo à envoyer" style={styles.photo}>
        <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
      </View>

      {message ? <ThemedText themeColor="danger">{message}</ThemedText> : null}
      <Button label="Envoyer pour analyse" onPress={send} loading={busy === 'envoi'} disabled={!familyId} />
      <Button variant="secondary" label="Autre photo" onPress={() => setImage(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  // Hauteur limitée : les boutons restent visibles sans faire défiler.
  photo: { width: '100%', height: 380, borderRadius: Spacing.two, overflow: 'hidden' },
});
