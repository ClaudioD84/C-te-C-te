import {
  formatShortDate,
  addDays,
  KINDERGARTEN_DOMAIN_LABELS,
  kindergartenActivitiesFor,
  type KindergartenActivity,
} from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { KindergartenActivityCard } from '@/features/kindergarten/activity-card';
import {
  useKindergartenWeek,
  useLogKindergartenActivity,
  useReplaceKindergartenActivity,
  useSetKindergartenTheme,
} from '@/features/kindergarten/api';
import { useChildProfile } from '@/features/profiles/api';
import { supabase } from '@/lib/supabase';

/** Intitulés des attendus du référentiel liés aux activités (« Ce que ça travaille »). */
function useExpectationLabels(codes: readonly string[]) {
  return useQuery({
    queryKey: ['curriculum_labels', [...codes].sort()],
    enabled: codes.length > 0,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_item')
        .select('code, label')
        .in('code', [...codes]);
      if (error) throw error;
      return new Map(data.map((row) => [row.code as string, row.label as string]));
    },
  });
}

/** Mode maternelle : activités de la semaine à faire avec l'enfant (docs/maternelle/proposition.md). */
export default function KindergartenWeekScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId ?? '');
  const grade = child.data?.grade;
  const week = useKindergartenWeek(childId ?? '', grade);
  const setTheme = useSetKindergartenTheme(childId ?? '', week.data?.weekStart ?? '');
  const replace = useReplaceKindergartenActivity(childId ?? '', grade ?? 'M1', week.data);
  const logDone = useLogKindergartenActivity(childId ?? '');
  const [theme, setThemeText] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const all = grade ? kindergartenActivitiesFor(grade) : [];
  const labels = useExpectationLabels(all.map((a) => a.curriculumCode));

  if (!child.data || week.isLoading || !week.data) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const data = week.data;
  const chosen = new Set(data.activities.map((a) => a.code));
  const themeValue = theme ?? data.theme ?? '';
  const card = (activity: KindergartenActivity, actions: React.ReactNode) => (
    <KindergartenActivityCard
      key={activity.code}
      activity={activity}
      audience="parent"
      done={data.doneThisWeek.has(activity.code)}
      expectation={labels.data?.get(activity.curriculumCode)}>
      {actions}
    </KindergartenActivityCard>
  );

  return (
    <Screen>
      <ThemedText type="subtitle">Activités de la semaine</ThemedText>
      <ThemedText themeColor="textSecondary">
        Semaine du {formatShortDate(data.weekStart)} au {formatShortDate(addDays(data.weekStart, 6))}. De
        courts jeux à faire avec {child.data.alias}, sans devoirs ni évaluation : faites-en ce que vous
        pouvez, rien ne se rattrape.
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <TextField
          label="Thème de la classe cette semaine (facultatif)"
          placeholder="Ex. L’automne, les animaux de la ferme"
          value={themeValue}
          onChangeText={setThemeText}
          maxLength={80}
        />
        <Button
          variant="secondary"
          label="Adapter les activités au thème"
          disabled={themeValue.trim() === (data.theme ?? '')}
          loading={setTheme.isPending}
          onPress={() => setTheme.mutate(themeValue)}
        />
      </ThemedView>

      {data.activities.map((activity) =>
        card(
          activity,
          <View style={styles.actions}>
            {!data.doneThisWeek.has(activity.code) ? (
              <Button label="On l'a fait !" style={styles.flex} onPress={() => logDone(activity)} />
            ) : null}
            <Button
              variant="secondary"
              label="Autre activité"
              accessibilityLabel={`Proposer une autre activité à la place de ${activity.title}`}
              style={styles.flex}
              onPress={() => replace.mutate({ code: activity.code })}
            />
          </View>,
        ),
      )}

      {!browsing ? (
        <Button variant="secondary" label="Voir toutes les activités" onPress={() => setBrowsing(true)} />
      ) : (
        <>
          <ThemedText type="subtitle">Toutes les activités</ThemedText>
          {all
            .filter((a) => !chosen.has(a.code))
            .map((activity) => {
              const sameDomain = data.activities.find((a) => a.domain === activity.domain);
              return card(
                activity,
                <Button
                  variant="secondary"
                  label={
                    sameDomain ? `Choisir à la place de « ${sameDomain.title} »` : 'Ajouter à la semaine'
                  }
                  onPress={() =>
                    replace.mutate({ code: sameDomain?.code ?? activity.code, replacement: activity.code })
                  }
                />,
              );
            })}
          <ThemedText type="small" themeColor="textSecondary">
            Domaines : {Object.values(KINDERGARTEN_DOMAIN_LABELS).join(' · ')}.
          </ThemedText>
        </>
      )}

      <Button
        variant="secondary"
        label="Voir le programme de l'année"
        onPress={() => router.push({ pathname: '/programme/[childId]', params: { childId: childId ?? '' } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
