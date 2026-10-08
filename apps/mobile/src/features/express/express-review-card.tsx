import { addDays, toIsoDate, TASK_KIND_LABELS, type LearningSettings } from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useUpcomingTasks } from '@/features/planning/api';
import { useTaskFlashcards } from '@/features/study/api';

/** Console enfant, la veille d'une interro ou d'un examen : quelques minutes avec ses cartes. */
export function ExpressReviewCard({ childId, settings }: { childId: string; settings: LearningSettings }) {
  const tomorrow = addDays(toIsoDate(new Date()), 1);
  const tasks = useUpcomingTasks(childId);
  const evaluation = tasks.data?.find(
    (t) => (t.kind === 'interro' || t.kind === 'examen') && !t.mockExam && t.dueDate === tomorrow,
  );
  const cards = useTaskFlashcards(childId, evaluation?.id);
  const count = cards.data?.length ?? 0;
  if (!evaluation || count === 0) return null;

  return (
    <ThemedView type="backgroundSelected" style={styles.card}>
      <ThemedText type="subtitle">⚡ Demain : {TASK_KIND_LABELS[evaluation.kind].toLowerCase()}</ThemedText>
      <ThemedText style={learningTextStyle(settings)}>
        {evaluation.subject} · {evaluation.description}. Quelques minutes pour revoir l’essentiel ?
      </ThemedText>
      <Button
        label={`Révision express (${count} carte${count > 1 ? 's' : ''})`}
        onPress={() => router.push({ pathname: '/enfant/cartes', params: { taskId: evaluation.id } })}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
});
