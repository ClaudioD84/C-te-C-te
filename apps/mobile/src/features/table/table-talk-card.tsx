import { addDays, tableQuestions, toIsoDate } from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSessions } from '@/features/planning/api';
import { usePacksForTasks } from '@/features/study/api';

/**
 * Cockpit : « Ce soir à table », trois questions sur ce que l'enfant a travaillé aujourd'hui (ou hier),
 * tirées de ses quiz, pour en parler en famille. Rien n'est affiché les jours sans travail.
 */
export function TableTalkCard({ childId, alias }: { childId: string; alias: string }) {
  const today = toIsoDate(new Date());
  const sessions = useSessions(childId, addDays(today, -1), 2);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState(false);

  const done = (sessions.data ?? []).flatMap((s) =>
    s.study_session_task.filter((i) => i.done_at !== null && i.activity !== 'faire'),
  );
  const subjectOf = new Map(done.map((i) => [i.task_id, i.task.subject]));
  const packs = usePacksForTasks([...subjectOf.keys()]);
  const questions = tableQuestions(
    (packs.data ?? [])
      .filter((p) => !p.content.topicUnclear)
      .map((p) => ({ subject: subjectOf.get(p.task_id) ?? '', quiz: p.content.quiz })),
    `${childId}|${today}`,
  );
  if (questions.length === 0) return null;

  return (
    <ThemedView type="backgroundSelected" style={styles.card}>
      <ThemedText type="smallBold">🍽️ Ce soir à table</ThemedText>
      {!open ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {alias} a travaillé aujourd’hui : quelques questions pour en parler ensemble, comme un jeu.
          </ThemedText>
          <Button variant="secondary" label="Voir les questions" onPress={() => setOpen(true)} />
        </>
      ) : (
        <>
          {questions.map((q) => (
            <View key={q.question} style={styles.question}>
              <ThemedText type="small" themeColor="primary">
                {q.subject}
              </ThemedText>
              <ThemedText>{q.question}</ThemedText>
              {answers ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Réponse : {q.answer}
                </ThemedText>
              ) : null}
            </View>
          ))}
          <Button
            variant="secondary"
            label={answers ? 'Cacher les réponses' : 'Voir les réponses'}
            onPress={() => setAnswers(!answers)}
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  question: { gap: Spacing.half },
});
