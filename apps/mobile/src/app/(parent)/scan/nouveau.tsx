import {
  addDocument,
  addPhotos,
  canAddDocument,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  documentsToSend,
  MAX_DOCUMENTS_PER_SEND,
  MAX_PAGES_PER_DOCUMENT,
  removeDocument,
  removePage,
  selectDocument,
  setDocumentType,
  startDraft,
  type DocumentsDraft,
  type DocumentType,
  type DraftDocument,
} from '@cote-a-cote/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { submitScan, useFamilyId } from '@/features/scan/api';
import { prepareImage, type PreparedImage } from '@/features/scan/image';
import { useTheme } from '@/hooks/use-theme';

const DOCUMENT_HINTS: Record<DocumentType, string> = {
  journal_de_classe: 'Une page de journal peut contenir plusieurs jours.',
  notes_de_cours: 'Seules les consignes de travail deviennent des tâches.',
  interrogation:
    'L’interrogation corrigée : les notions où il s’est trompé deviennent des exercices de remédiation, guidés puis en autonomie. La note n’est jamais relevée.',
  dictee:
    'La dictée corrigée : les mots où il y avait une faute, écrits correctement, rejoignent les mots à revoir.',
  vocabulaire:
    'Une liste de mots avec leur traduction (langues) ou leur définition (français) : elle devient des cartes de révision.',
};

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/**
 * Photos d'un ou de plusieurs documents (F3) : chaque document peut avoir plusieurs pages, lues ensemble par une
 * seule analyse ; tous les documents partent en une fois, puis le parent les relit un par un.
 */
export default function NewScanScreen() {
  const { childId, type } = useLocalSearchParams<{ childId: string; type?: string }>();
  const { data: familyId } = useFamilyId();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DocumentsDraft<PreparedImage>>(() =>
    startDraft(DOCUMENT_TYPES.find((t) => t === type) ?? 'journal_de_classe'),
  );
  // Plusieurs photos choisies ensemble : le parent dit si ce sont les pages d'un document ou des documents.
  const [choosing, setChoosing] = useState<PreparedImage[] | null>(null);
  const [busy, setBusy] = useState<'preparation' | 'envoi' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Documents déjà partis lors d'un envoi interrompu : l'envoi suivant reprend avec les autres.
  const [sent, setSent] = useState(0);

  const ready = documentsToSend(draft);
  const several = draft.documents.length > 1;

  function add(photos: PreparedImage[], as: 'pages' | 'documents') {
    const result = addPhotos(draft, photos, as);
    setDraft(result.draft);
    setChoosing(null);
    if (result.dropped > 0) {
      const limit =
        as === 'pages'
          ? `${MAX_PAGES_PER_DOCUMENT} pages au plus par document`
          : `${MAX_DOCUMENTS_PER_SEND} documents au plus par envoi`;
      setMessage(
        `${limit} : ${plural(result.dropped, 'photo')} non ajoutée${result.dropped > 1 ? 's' : ''}.`,
      );
    }
  }

  async function pick(source: 'camera' | 'galerie') {
    setMessage(null);
    // La galerie passe par le sélecteur du système : aucun accès à toute la photothèque n'est demandé.
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : { granted: true };
    if (!permission.granted) {
      setMessage("L'accès a été refusé. Vous pouvez l'autoriser dans les réglages du téléphone.");
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 1,
      // Galerie : plusieurs photos d'un coup, dans l'ordre où elles sont touchées.
      allowsMultipleSelection: source === 'galerie',
      selectionLimit: MAX_DOCUMENTS_PER_SEND,
      orderedSelection: true,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;

    setBusy('preparation');
    try {
      const photos: PreparedImage[] = [];
      for (const asset of result.assets)
        photos.push(await prepareImage(asset.uri, asset.width, asset.height));
      if (photos.length > 1) setChoosing(photos);
      else add(photos, 'pages');
    } catch {
      setMessage("Une photo n'a pas pu être préparée. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!familyId || ready.length === 0) return;
    setBusy('envoi');
    setMessage(null);
    const scanIds: string[] = [];
    let remaining = draft;
    try {
      for (const document of ready) {
        scanIds.push(
          await submitScan({ familyId, childId, documentType: document.type, pages: document.pages }),
        );
        remaining = removeDocument(remaining, remaining.documents.indexOf(document));
      }
    } catch {
      setDraft(remaining);
      setSent(sent + scanIds.length);
      setMessage(
        scanIds.length > 0
          ? `${plural(scanIds.length, 'document')} envoyé${scanIds.length > 1 ? 's' : ''}. L'envoi des autres a échoué : vérifiez votre connexion et réessayez.`
          : "L'envoi a échoué. Vérifiez votre connexion et réessayez.",
      );
      setBusy(null);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['pending_scans', childId] });
    // Un seul document : sa relecture directement ; plusieurs : la liste des documents à relire.
    if (sent + scanIds.length === 1)
      router.replace({ pathname: '/scan/[scanId]', params: { scanId: scanIds[0]! } });
    else router.replace({ pathname: '/scan/a-relire', params: { childId } });
  }

  if (busy === 'preparation') {
    return (
      <Screen>
        <ActivityIndicator />
        <ThemedText style={styles.center}>Préparation des photos…</ThemedText>
      </Screen>
    );
  }

  if (choosing) {
    const n = choosing.length;
    return (
      <Screen>
        <ThemedText type="smallBold">Vous avez choisi {n} photos. Ce sont :</ThemedText>
        <Button label={`Les ${n} pages d’un même document`} onPress={() => add(choosing, 'pages')} />
        <Button
          variant="secondary"
          label={`${n} documents différents`}
          onPress={() => add(choosing, 'documents')}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Les pages d’un même document (une interrogation de deux feuilles, une liste recto verso) sont lues
          ensemble. Des documents différents sont relus chacun à part.
        </ThemedText>
        <Button variant="secondary" label="Annuler" onPress={() => setChoosing(null)} />
      </Screen>
    );
  }

  const sendLabel =
    ready.length > 1 ? `Envoyer les ${ready.length} documents pour analyse` : 'Envoyer pour analyse';
  return (
    <Screen>
      {draft.documents.map((document, i) =>
        i === draft.active ? (
          <ActiveDocument
            key={document.key}
            document={document}
            number={several ? i + 1 : null}
            onType={(value) => setDraft(setDocumentType(draft, value))}
            onRemovePage={(page) => setDraft(removePage(draft, i, page))}
            onPick={pick}
          />
        ) : (
          <ThemedView key={document.key} type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              Document {i + 1} · {DOCUMENT_TYPE_LABELS[document.type]} ·{' '}
              {plural(document.pages.length, 'page')}
            </ThemedText>
            <Pages document={document} number={i + 1} />
            <View style={styles.row}>
              <Button
                variant="secondary"
                label="Modifier"
                accessibilityLabel={`Modifier le document ${i + 1}`}
                style={styles.flex}
                onPress={() => setDraft(selectDocument(draft, i))}
              />
              <Button
                variant="secondary"
                label="Retirer"
                accessibilityLabel={`Retirer le document ${i + 1}`}
                style={styles.flex}
                onPress={() => setDraft(removeDocument(draft, i))}
              />
            </View>
          </ThemedView>
        ),
      )}

      {canAddDocument(draft) ? (
        <Button
          variant="secondary"
          label="＋ Ajouter un autre document"
          onPress={() => setDraft(addDocument(draft))}
        />
      ) : null}
      {message ? <ThemedText themeColor="danger">{message}</ThemedText> : null}
      {ready.length > 0 ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Chaque page doit être lisible : elle est envoyée telle quelle pour l&apos;analyse, puis vous
            relisez la liste des devoirs{ready.length > 1 ? ' de chaque document' : ''}.
          </ThemedText>
          <Button label={sendLabel} onPress={send} loading={busy === 'envoi'} disabled={!familyId} />
        </>
      ) : null}
    </Screen>
  );
}

function ActiveDocument({
  document,
  number,
  onType,
  onRemovePage,
  onPick,
}: {
  document: DraftDocument<PreparedImage>;
  /** Numéro affiché quand l'envoi compte plusieurs documents. */
  number: number | null;
  onType: (type: DocumentType) => void;
  onRemovePage: (page: number) => void;
  onPick: (source: 'camera' | 'galerie') => void;
}) {
  const theme = useTheme();
  const count = document.pages.length;
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, number !== null && { borderColor: theme.primary, borderWidth: 2 }]}>
      {number !== null ? <ThemedText type="smallBold">Document {number}</ThemedText> : null}
      <ChoiceChips
        label="Que photographiez-vous ?"
        options={DOCUMENT_TYPES}
        labels={DOCUMENT_TYPE_LABELS}
        selected={[document.type]}
        onToggle={onType}
      />
      <ThemedText themeColor="textSecondary">
        Une photo par page, à plat et bien éclairée ({MAX_PAGES_PER_DOCUMENT} pages au plus, lues ensemble).{' '}
        {DOCUMENT_HINTS[document.type]}
      </ThemedText>
      <Pages document={document} number={number ?? 1} onRemove={onRemovePage} />
      {count < MAX_PAGES_PER_DOCUMENT ? (
        <>
          <Button
            label={count === 0 ? 'Prendre une photo' : 'Photographier la page suivante'}
            onPress={() => onPick('camera')}
          />
          <Button
            variant="secondary"
            label={count === 0 ? 'Choisir dans la galerie' : 'Ajouter des pages depuis la galerie'}
            onPress={() => onPick('galerie')}
          />
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Ce document a atteint {MAX_PAGES_PER_DOCUMENT} pages.
        </ThemedText>
      )}
    </ThemedView>
  );
}

/**
 * Aperçu des pages du document en cours : en grand pour une seule page (vérifier qu'elle est lisible), en
 * vignettes sinon, chacune avec son bouton « Retirer ». Sans `onRemove` (document terminé) : petites vignettes.
 */
function Pages({
  document,
  number,
  onRemove,
}: {
  document: DraftDocument<PreparedImage>;
  number: number;
  onRemove?: (page: number) => void;
}) {
  if (document.pages.length === 0) return null;
  const single = document.pages.length === 1 && onRemove !== undefined;
  return (
    <View style={styles.pages}>
      {document.pages.map((page, j) => (
        <View key={j} style={!onRemove ? styles.thumb : single ? styles.single : styles.half}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Document ${number}, page ${j + 1}`}
            style={[styles.photo, single && styles.photoLarge, !onRemove && styles.photoSmall]}>
            <Image source={{ uri: page.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
          </View>
          {onRemove ? (
            <Button
              variant="secondary"
              label={single ? 'Retirer cette photo' : `Retirer la page ${j + 1}`}
              accessibilityLabel={`Retirer la page ${j + 1} du document ${number}`}
              onPress={() => onRemove(j)}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  pages: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  single: { width: '100%', gap: Spacing.one },
  half: { width: '48%', gap: Spacing.one },
  thumb: { width: 64 },
  photo: { width: '100%', height: 200, borderRadius: Spacing.two, overflow: 'hidden' },
  // Une seule page : assez grande pour juger la lisibilité, les boutons restent visibles.
  photoLarge: { height: 320 },
  photoSmall: { height: 86, borderRadius: Spacing.one },
});
