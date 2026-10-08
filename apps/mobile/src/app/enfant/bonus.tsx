import { bonusQuestions, deriveLearningSettings, studyPackSchema, toIsoDate } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { useLogPractice } from '@/features/study/api';
import { QuizPlayer } from '@/features/study/quiz-player';
import { supabase } from '@/lib/supabase';

/** Défi bonus, après la mission : 3 questions de ses fiches récentes, pour le plaisir (et des points). */
export default function BonusScreen() {
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  const logPractice = useLogPractice(childId);
  const today = toIsoDate(new Date());
  const questions = useQuery({
    queryKey: ['bonus', childId, today],
    enabled: childId.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_pack')
        .select('content')
        .eq('child_id', childId)
        .is('reported_at', null)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      const quizzes = data.map((row) => {
        const parsed = studyPackSchema.safeParse(row.content);
        return parsed.success && !parsed.data.topicUnclear ? parsed.data.quiz : [];
      });
      return bonusQuestions(quizzes, `${childId}|${today}`);
    },
  });

  if (!child.data || questions.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  return (
    <ChildScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">⭐ Défi bonus</ThemedText>
        {questions.data && questions.data.length > 0 ? (
          <QuizPlayer
            questions={questions.data}
            settings={deriveLearningSettings(child.data)}
            onFinish={(score, total) => logPractice('bonus', null, score, total)}
          />
        ) : (
          <ThemedText>Pas encore de questions bonus : elles viendront avec tes prochaines fiches.</ThemedText>
        )}
        <Button variant="secondary" label="Retour à la mission" onPress={() => router.back()} />
      </ScrollView>
    </ChildScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Spacing.six },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
});
