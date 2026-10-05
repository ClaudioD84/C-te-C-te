import { deriveLearningSettings } from '@cote-a-cote/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { ExerciseList } from '@/features/study/exercise-list';
import { FicheView } from '@/features/study/fiche-view';
import { QuizPlayer } from '@/features/study/quiz-player';
import { logLearningEvent, useInvalidateRewards } from '@/features/rewards/api';
import { useGeneratePack, useStudyPack } from '@/features/study/api';

type Section = 'fiche' | 'quiz' | 'exercices';
const SECTION_LABELS: Record<Section, string> = { fiche: 'Fiche', quiz: 'Quiz', exercices: 'Exercices' };

/** Entraînement de l'enfant sur une tâche : fiche, quiz et exercices. */
export default function StudyScreen() {
  const { taskId, mode } = useLocalSearchParams<{ taskId: string; mode?: Section }>();
  const { activeChildId } = useChildMode();
  const child = useChildProfile(activeChildId ?? '');
  const pack = useStudyPack(taskId);
  const generate = useGeneratePack(taskId);
  const requested = useRef(false);
  const [section, setSection] = useState<Section | null>(mode ?? null);
  const invalidateRewards = useInvalidateRewards(activeChildId ?? '');

  // Paquet absent : on le prépare à l'arrivée sur l'écran.
  const missing = pack.isSuccess && pack.data === null;
  useEffect(() => {
    if (missing && !requested.current) {
      requested.current = true;
      generate.mutate(false);
    }
  }, [missing, generate]);

  const back = <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />;

  if (!child.data || pack.isLoading || generate.isPending || (missing && !generate.isError)) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.centerText}>Je prépare ta fiche et ton quiz…</ThemedText>
        {back}
      </ThemedView>
    );
  }

  const settings = deriveLearningSettings(child.data);
  const content = pack.data?.content;

  if (!content || content.topicUnclear) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText style={styles.centerText}>
          {generate.error
            ? generate.error.message
            : "Je n'ai pas assez d'informations sur cette leçon. Demande à ton parent de préciser la tâche."}
        </ThemedText>
        {generate.error ? <Button label="Réessayer" onPress={() => generate.mutate(false)} /> : null}
        {back}
      </ThemedView>
    );
  }

  const available = (['fiche', 'quiz', 'exercices'] as const).filter((s) =>
    s === 'fiche'
      ? content.fiche !== null
      : s === 'quiz'
        ? content.quiz.length > 0
        : content.exercises.length > 0,
  );
  const current = section && available.includes(section) ? section : available[0];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ChoiceChips
          label="Je veux…"
          options={available}
          labels={SECTION_LABELS}
          selected={current ? [current] : []}
          onToggle={setSection}
        />
        {current === 'fiche' && content.fiche ? (
          <FicheView fiche={content.fiche} settings={settings} />
        ) : null}
        {current === 'quiz' ? (
          <QuizPlayer
            questions={content.quiz}
            settings={settings}
            onFinish={(score, total) =>
              logLearningEvent(activeChildId ?? '', 'quiz', { task_id: taskId, score, total }).then(
                invalidateRewards,
              )
            }
          />
        ) : null}
        {current === 'exercices' ? <ExerciseList exercises={content.exercises} settings={settings} /> : null}
        {back}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
});
