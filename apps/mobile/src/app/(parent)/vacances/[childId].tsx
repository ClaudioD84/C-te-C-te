import { HOLIDAY_IDEAS } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CultureSuggestions } from '@/features/culture/culture-card';
import type { CultureSuggestion } from '@/features/culture/api';
import { useChildProfile } from '@/features/profiles/api';
import { supabase } from '@/lib/supabase';

const OUTING_KINDS = ['sortie', 'musee', 'spectacle', 'patrimoine'];

/** Idées pour les vacances : activités sans écran et sorties de la base de contenus vérifiés (F6). */
export default function HolidayIdeasScreen() {
  const { childId = '' } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const grade = child.data?.grade;
  const outings = useQuery({
    queryKey: ['culture', 'vacances', grade],
    enabled: Boolean(grade),
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<CultureSuggestion[]> => {
      const { data, error } = await supabase
        .from('cultural_resource')
        .select('id, kind, title, description, url, place, subjects')
        .contains('grades', [grade])
        .in('kind', OUTING_KINDS)
        .limit(6);
      if (error) throw error;
      return data as CultureSuggestion[];
    },
  });

  return (
    <Screen>
      <ThemedText type="subtitle">Idées pour les vacances</ThemedText>
      <ThemedText themeColor="textSecondary">
        Pas de devoirs : des moments ensemble qui font travailler sans en avoir l’air.
        {child.data ? ` À adapter à l’âge de ${child.data.alias}.` : ''}
      </ThemedText>
      {HOLIDAY_IDEAS.map((idea) => (
        <ThemedView key={idea.title} type="backgroundElement" style={styles.card}>
          <View style={styles.row}>
            <ThemedText style={styles.emoji} aria-hidden>
              {idea.emoji}
            </ThemedText>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{idea.title}</ThemedText>
              <ThemedText>{idea.detail}</ThemedText>
              <ThemedText type="small" themeColor="primary">
                {idea.skill}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      ))}
      <CultureSuggestions suggestions={outings.data} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  emoji: { fontSize: 32, lineHeight: 40 },
  flex: { flex: 1, gap: Spacing.half },
});
