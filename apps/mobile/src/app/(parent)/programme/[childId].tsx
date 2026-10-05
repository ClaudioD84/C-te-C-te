import { CURRICULUM_SUBJECTS, GRADE_LABELS } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildProfile } from '@/features/profiles/api';
import { supabase } from '@/lib/supabase';

interface CurriculumRow {
  id: string;
  parent_id: string | null;
  subject: string;
  kind: 'domaine' | 'competence' | 'attendu';
  code: string;
  label: string;
}

/** Programme de l'année (F2) : attendus du référentiel pour l'année de l'enfant, par matière. */
export default function ProgrammeScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const grade = child.data?.grade;
  const [selected, setSelected] = useState<string>(CURRICULUM_SUBJECTS[0]);

  // Une matière à la fois : une année complète dépasse la limite de lignes d'une requête.
  const items = useQuery({
    queryKey: ['curriculum', grade, selected],
    enabled: Boolean(grade),
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_item')
        .select('id, parent_id, subject, kind, code, label')
        .contains('grades', [grade])
        .eq('subject', selected)
        .order('created_at');
      if (error) throw error;
      return data as CurriculumRow[];
    },
  });

  if (child.isLoading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const rows = items.data ?? [];
  const subjects = [...CURRICULUM_SUBJECTS];
  const current = selected;

  return (
    <Screen>
      <ThemedText type="subtitle">{grade ? GRADE_LABELS[grade] : 'Programme'}</ThemedText>
      <ChoiceChips
        label="Matière"
        options={subjects}
        labels={Object.fromEntries(subjects.map((x) => [x, x]))}
        selected={[current]}
        onToggle={setSelected}
      />
      {items.isLoading ? <ActivityIndicator /> : null}
      {!items.isLoading && rows.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Pas d&apos;attendus pour cette matière cette année.
        </ThemedText>
      ) : null}
      {subjects
        .filter((subject) => subject === current)
        .map((subject) => (
          <ThemedView key={subject} type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{subject}</ThemedText>
            {rows
              .filter((r) => r.subject === subject && r.kind === 'competence')
              .map((competence) => (
                <View key={competence.id} style={styles.group}>
                  <ThemedText type="smallBold">{competence.label}</ThemedText>
                  {rows
                    .filter((r) => r.parent_id === competence.id)
                    .map((attendu) => (
                      <ThemedText
                        key={attendu.id}
                        type="small"
                        themeColor="textSecondary"
                        style={styles.indent}>
                        • {attendu.label}
                      </ThemedText>
                    ))}
                </View>
              ))}
          </ThemedView>
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  indent: { paddingLeft: Spacing.three },
  group: { gap: Spacing.one, marginBottom: Spacing.two },
});
