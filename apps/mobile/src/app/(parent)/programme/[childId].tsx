import { GRADE_LABELS } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

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

  const items = useQuery({
    queryKey: ['curriculum', grade],
    enabled: Boolean(grade),
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_item')
        .select('id, parent_id, subject, kind, code, label')
        .contains('grades', [grade])
        .order('subject')
        .order('code');
      if (error) throw error;
      return data as CurriculumRow[];
    },
  });

  if (child.isLoading || items.isLoading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const rows = items.data ?? [];
  const subjects = [...new Set(rows.map((r) => r.subject))];

  return (
    <Screen>
      <ThemedText type="subtitle">{grade ? GRADE_LABELS[grade] : 'Programme'}</ThemedText>
      {rows.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Le programme de cette année n&apos;est pas encore disponible dans l&apos;application.
        </ThemedText>
      ) : null}
      {subjects.map((subject) => (
        <ThemedView key={subject} type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">{subject}</ThemedText>
          {rows
            .filter((r) => r.subject === subject)
            .map((row) => (
              <ThemedText
                key={row.id}
                type={row.kind === 'attendu' ? 'small' : 'default'}
                themeColor={row.kind === 'attendu' ? 'textSecondary' : 'text'}
                style={row.kind === 'attendu' ? styles.indent : undefined}>
                {row.kind === 'attendu' ? '• ' : ''}
                {row.label}
              </ThemedText>
            ))}
        </ThemedView>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  indent: { paddingLeft: Spacing.three },
});
