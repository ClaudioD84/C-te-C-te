import { CURRICULUM_SUBJECTS } from '@cote-a-cote/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { useCurriculumExpectations, useSetTaskCurriculum, useTaskCurriculum } from './api';

const MAX_RESULTS = 25;

/** Normalise pour une recherche sans accents ni majuscules. */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Rattachement d'une tâche au programme officiel (F2) : proposé par l'IA à la préparation de la fiche,
 * modifiable ou retirable par le parent.
 */
export function CurriculumLinkCard({
  taskId,
  grade,
  track,
}: {
  taskId: string;
  grade: string;
  track: string;
}) {
  const link = useTaskCurriculum(taskId);
  const setLink = useSetTaskCurriculum(taskId);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState<string>(CURRICULUM_SUBJECTS[0]);
  const [search, setSearch] = useState('');
  const options = useCurriculumExpectations(grade, track, subject);

  function startEditing() {
    if (link.data) setSubject(link.data.subject);
    setSearch('');
    setEditing(true);
  }

  async function choose(id: string | null) {
    await setLink.mutateAsync(id);
    setEditing(false);
  }

  const words = fold(search).split(/\s+/).filter(Boolean);
  const matches = (options.data ?? [])
    .filter((o) => words.every((w) => fold(o.label).includes(w)))
    .slice(0, MAX_RESULTS);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Programme officiel</ThemedText>
      {link.isLoading ? <ActivityIndicator /> : null}
      {!link.isLoading ? (
        link.data ? (
          <ThemedText>
            {link.data.subject} · {link.data.label}
          </ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">
            Pas encore rattachée à un attendu du programme. Le rattachement est proposé à la préparation de la
            fiche.
          </ThemedText>
        )
      ) : null}

      {!editing ? (
        <Button variant="secondary" label="Modifier le rattachement" onPress={startEditing} />
      ) : (
        <>
          <ChoiceChips
            label="Matière du programme"
            options={CURRICULUM_SUBJECTS}
            labels={Object.fromEntries(CURRICULUM_SUBJECTS.map((s) => [s, s]))}
            selected={[subject]}
            onToggle={setSubject}
          />
          <TextField label="Rechercher un attendu" value={search} onChangeText={setSearch} />
          {options.isLoading ? <ActivityIndicator /> : null}
          {!options.isLoading && matches.length === 0 ? (
            <ThemedText themeColor="textSecondary">Aucun attendu trouvé pour cette année.</ThemedText>
          ) : null}
          {matches.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={`Rattacher à : ${option.label}`}
              accessibilityState={{ selected: option.id === link.data?.id }}
              onPress={() => choose(option.id)}
              style={styles.option}>
              <ThemedText type="small">
                {option.id === link.data?.id ? '✓ ' : ''}
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
          {link.data ? (
            <Button variant="secondary" label="Retirer le rattachement" onPress={() => choose(null)} />
          ) : null}
          <Button variant="secondary" label="Annuler" onPress={() => setEditing(false)} />
          {setLink.error ? (
            <ThemedText themeColor="danger" accessibilityRole="alert">
              L’enregistrement a échoué. Vérifiez votre connexion.
            </ThemedText>
          ) : null}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  option: { paddingVertical: Spacing.two, minHeight: 44, justifyContent: 'center' },
});
