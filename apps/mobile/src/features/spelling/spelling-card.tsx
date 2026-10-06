import { parseSpellingWords } from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { useSaveSpellingList, useSpellingList } from './api';

/** Planning : le parent recopie les mots de la dictée préparée de la semaine. */
export function SpellingCard({ childId, alias }: { childId: string; alias: string }) {
  const list = useSpellingList(childId);
  const save = useSaveSpellingList(childId);
  // Texte saisi ; tant que le parent n'a rien tapé, la liste enregistrée.
  const [typed, setText] = useState<string | null>(null);
  const text = typed ?? (list.data ?? []).join('\n');
  const words = parseSpellingWords(text);
  const saved = (list.data ?? []).join('\n') === words.join('\n');

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Dictée préparée de la semaine</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Recopiez les mots ou groupes de mots, un par ligne : {alias} s’entraîne en les écoutant puis en les
        écrivant (« Ma dictée » sur sa console).
      </ThemedText>
      <TextField
        label="Mots de la dictée"
        value={text}
        onChangeText={setText}
        multiline
        autoCapitalize="none"
        placeholder={'le château\nune promenade\nils marchaient'}
      />
      <Button
        variant={saved ? 'secondary' : 'primary'}
        label={
          saved
            ? words.length > 0
              ? `Enregistrée (${words.length} mots)`
              : 'Aucun mot'
            : 'Enregistrer la dictée'
        }
        disabled={saved}
        loading={save.isPending}
        onPress={() => save.mutate(words)}
      />
      {save.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          L’enregistrement a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
