import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { StoredChildProfile } from '@/features/profiles/api';
import { supabase } from '@/lib/supabase';

const HIDDEN_KEY = 'premiers_pas_masques';

async function count(table: 'task' | 'study_session' | 'learning_event') {
  const query = supabase.from(table).select('*', { count: 'exact', head: true });
  // Le temps passé au coin détente n'est pas une mission.
  const { count: n, error } = await (table === 'learning_event' ? query.neq('type', 'detente') : query);
  if (error) throw error;
  return n ?? 0;
}

/** Ce que la famille a déjà fait, pour la liste des premiers pas. */
function useProgress(enabled: boolean) {
  return useQuery({
    queryKey: ['premiers_pas'],
    enabled,
    queryFn: async () => {
      const [tasks, sessions, events] = await Promise.all([
        count('task'),
        count('study_session'),
        count('learning_event'),
      ]);
      return { tasks: tasks > 0, sessions: sessions > 0, events: events > 0 };
    },
  });
}

/**
 * Accueil guidé : les 4 étapes pour une première semaine réussie, cochées au fur et à mesure.
 * Disparaît quand tout est fait, ou à la demande (mémorisé sur l'appareil).
 */
export function FirstSteps({ profiles }: { profiles: readonly StoredChildProfile[] }) {
  const [hidden, setHidden] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_KEY)
      .then((value) => setHidden(value === '1'))
      .catch(() => setHidden(false));
  }, []);
  const progress = useProgress(hidden === false);

  if (hidden !== false || !progress.data) return null;
  const first = profiles[0];
  const schoolChild = profiles.find((c) => !c.grade.startsWith('M'));
  const steps = [
    {
      done: profiles.length > 0,
      title: 'Ajouter votre enfant',
      detail: 'Son prénom, son année et ses besoins éventuels.',
      action: { label: 'Ajouter mon premier enfant', onPress: () => router.push('/profils/nouveau') },
    },
    {
      done: progress.data.tasks || (first !== undefined && !schoolChild),
      title: 'Photographier le journal de classe',
      detail: 'Les noms sont masqués avant l’envoi ; vous vérifiez la liste des devoirs.',
      action: schoolChild
        ? {
            label: 'Prendre la photo',
            onPress: () => router.push({ pathname: '/scan/nouveau', params: { childId: schoolChild.id } }),
          }
        : null,
    },
    {
      done: progress.data.sessions || (first !== undefined && !schoolChild),
      title: 'Publier le planning de la semaine',
      detail: 'Des séances courtes, adaptées à son âge et à ses besoins.',
      action: schoolChild
        ? {
            label: 'Voir le planning',
            onPress: () =>
              router.push({ pathname: '/planning/[childId]', params: { childId: schoolChild.id } }),
          }
        : null,
    },
    {
      done: progress.data.events,
      title: 'Lancer la première mission',
      detail: 'Votre enfant voit seulement sa mission du jour, en grands boutons.',
      action: null,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const next = steps.find((s) => !s.done)!;

  return (
    <ThemedView type="backgroundSelected" style={styles.card} accessibilityLabel="Premiers pas">
      <ThemedText type="smallBold">
        Premiers pas · {doneCount} sur {steps.length}
      </ThemedText>
      {steps.map((step) => (
        <View key={step.title} style={styles.row}>
          <ThemedText accessibilityLabel={step.done ? `${step.title}, fait` : step.title}>
            {step.done ? '✅' : '⬜'} {step.title}
          </ThemedText>
          {step === next ? (
            <ThemedText type="small" themeColor="textSecondary">
              {step.detail}
            </ThemedText>
          ) : null}
        </View>
      ))}
      {next.action ? <Button label={next.action.label} onPress={next.action.onPress} /> : null}
      <Button
        variant="secondary"
        label="Masquer les premiers pas"
        onPress={() => {
          setHidden(true);
          AsyncStorage.setItem(HIDDEN_KEY, '1').catch(() => undefined);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { gap: Spacing.half },
});
