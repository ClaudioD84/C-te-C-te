import { addDays, toIsoDate } from '@cote-a-cote/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const SUBJECTS = ['Français', 'Mathématiques', 'Éveil', 'Néerlandais', 'Sciences', 'Anglais'] as const;
/** Une notion signalée par l'enseignant se retravaille dans la semaine. */
const REWORK_DAYS = 7;

function useAddRework(childId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ subject, notion }: { subject: string; notion: string }) => {
      const { error } = await supabase.from('task').insert({
        child_id: childId,
        subject,
        kind: 'lecon',
        description: `Retravailler : ${notion.trim()}`,
        due_date: addDays(toIsoDate(new Date()), REWORK_DAYS),
        status: 'validated',
        confidence: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', childId] }),
  });
}

/**
 * Remarque de l'enseignant (bulletin, journal de classe, réunion de parents) : elle devient une leçon
 * « Retravailler : … » à revoir dans la semaine, avec fiche et quiz comme les autres tâches.
 */
export function TeacherNoteCard({ childId }: { childId: string }) {
  const add = useAddRework(childId);
  const [subject, setSubject] = useState<string>('Français');
  const [notion, setNotion] = useState('');
  const [added, setAdded] = useState<string | null>(null);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Remarque de l’enseignant</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        « Doit revoir les accords », « confond les fleuves »… : notez la notion, elle est ajoutée au planning
        de la semaine avec sa fiche et son quiz.
      </ThemedText>
      <ChoiceChips
        label="Matière"
        options={SUBJECTS}
        labels={Object.fromEntries(SUBJECTS.map((s) => [s, s])) as Record<string, string>}
        selected={[subject]}
        onToggle={setSubject}
      />
      <TextField
        label="Notion à retravailler"
        placeholder="Ex. l’accord du participe passé"
        value={notion}
        onChangeText={(t) => {
          setNotion(t);
          setAdded(null);
        }}
        maxLength={120}
      />
      <Button
        variant="secondary"
        label="Ajouter au planning"
        disabled={notion.trim().length < 3}
        loading={add.isPending}
        onPress={() =>
          add.mutate(
            { subject, notion },
            {
              onSuccess: () => {
                setAdded(notion.trim());
                setNotion('');
              },
            },
          )
        }
      />
      {added ? (
        <ThemedText accessibilityLiveRegion="polite">
          ✓ « Retravailler : {added} » ajouté. Recalculez le planning pour le placer dans la semaine.
        </ThemedText>
      ) : null}
      {add.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          L’ajout a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
