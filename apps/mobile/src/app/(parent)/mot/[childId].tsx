import { formatShortDate } from '@cote-a-cote/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { NOTE_SUGGESTIONS, useChildNotes, useSendNote } from '@/features/notes/api';
import { useChildProfile } from '@/features/profiles/api';

const MAX_LENGTH = 200;

/** Le parent écrit un petit mot d'encouragement, affiché sur la console de l'enfant. */
export default function NoteScreen() {
  const { childId = '' } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const notes = useChildNotes(childId);
  const send = useSendNote(childId);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const alias = child.data?.alias ?? 'votre enfant';

  return (
    <Screen>
      <ThemedText type="subtitle">Un petit mot pour {alias}</ThemedText>
      <ThemedText themeColor="textSecondary">
        Il s’affichera en haut de sa mission, avec la lecture à voix haute. Pas de prénom : son pseudonyme
        suffit.
      </ThemedText>
      <ChoiceChips
        label="Idées"
        options={NOTE_SUGGESTIONS}
        labels={Object.fromEntries(NOTE_SUGGESTIONS.map((s) => [s, s])) as Record<string, string>}
        selected={NOTE_SUGGESTIONS.filter((s) => s === message)}
        onToggle={(s) => {
          setMessage(s);
          setSent(false);
        }}
      />
      <TextField
        label="Votre mot"
        value={message}
        onChangeText={(text) => {
          setMessage(text);
          setSent(false);
        }}
        maxLength={MAX_LENGTH}
        multiline
      />
      <ThemedText type="small" themeColor="textSecondary">
        {message.length} / {MAX_LENGTH}
      </ThemedText>
      {sent ? (
        <ThemedText accessibilityLiveRegion="polite">Envoyé ! {alias} le verra sur sa console.</ThemedText>
      ) : null}
      {send.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          L’envoi a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
      <Button
        label="Envoyer le mot"
        disabled={message.trim().length === 0}
        loading={send.isPending}
        onPress={() =>
          send.mutate(message, {
            onSuccess: () => {
              setMessage('');
              setSent(true);
            },
          })
        }
      />

      {(notes.data?.length ?? 0) > 0 ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Mots envoyés</ThemedText>
          {notes.data!.map((note) => (
            <View key={note.id}>
              <ThemedText>« {note.message} »</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatShortDate(note.created_at.slice(0, 10))} ·{' '}
                {note.seen_at ? `lu le ${formatShortDate(note.seen_at.slice(0, 10))}` : 'pas encore lu'}
              </ThemedText>
            </View>
          ))}
        </ThemedView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
