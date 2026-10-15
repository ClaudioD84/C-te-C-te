import { addDays, toIsoDate, vocabularyCards, type IsoDate, type VocabularyEntry } from '@cote-a-cote/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/** Par défaut, une semaine pour apprendre la liste (modifiable ensuite comme toute tâche). */
const DEFAULT_DAYS = 7;

function useCreateVocabularyCards(scanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subject: string;
      cards: { front: string; back: string }[];
      due: IsoDate;
    }) => {
      const { error } = await supabase.rpc('create_vocabulary_cards', {
        p_scan_id: scanId,
        p_subject: input.subject,
        p_cards: input.cards,
        p_due: input.due,
      });
      if (error) throw new Error(error.code === 'P0001' ? error.message : 'Création impossible. Réessayez.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
      queryClient.invalidateQueries({ queryKey: ['scan_tasks', scanId] });
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['study_packs'] });
    },
  });
}

/** Vérification d'une photo : liste de vocabulaire lue, à transformer en cartes de révision. */
export function VocabularyCard({
  scanId,
  entries,
  subject: readSubject,
  created,
}: {
  scanId: string;
  entries: readonly VocabularyEntry[];
  subject: string | null;
  created: boolean;
}) {
  const [subject, setSubject] = useState(readSubject ?? 'Français');
  const create = useCreateVocabularyCards(scanId);
  const cards = vocabularyCards(subject, entries);
  const missing = entries.length - cards.length;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Vocabulaire trouvé ({entries.length})</ThemedText>
      {entries.map((e, i) => (
        <ThemedText key={i}>
          {e.term}
          {e.meaning ? ` → ${e.meaning}` : ''}
        </ThemedText>
      ))}
      {created ? (
        <ThemedText accessibilityLiveRegion="polite">
          ✓ Cartes créées : votre enfant les révise dans « Cartes à revoir ».
        </ThemedText>
      ) : (
        <>
          <TextField label="Matière" value={subject} onChangeText={setSubject} maxLength={40} />
          {missing > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {missing} mot{missing > 1 ? 's' : ''} sans traduction ni définition : pas de carte pour{' '}
              {missing > 1 ? 'eux' : 'lui'}.
            </ThemedText>
          ) : null}
          {create.error ? (
            <ThemedText themeColor="danger" accessibilityRole="alert">
              {create.error.message}
            </ThemedText>
          ) : null}
          <Button
            label={`Créer ${cards.length} carte${cards.length > 1 ? 's' : ''} de révision`}
            disabled={cards.length === 0 || subject.trim().length === 0}
            loading={create.isPending}
            onPress={() =>
              create.mutate({
                subject: subject.trim(),
                cards,
                due: addDays(toIsoDate(new Date()), DEFAULT_DAYS),
              })
            }
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
