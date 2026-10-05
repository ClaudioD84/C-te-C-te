import { deriveLearningSettings, formatShortDate, TASK_KIND_LABELS } from '@cote-a-cote/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CurriculumLinkCard } from '@/features/curriculum/curriculum-link';
import { printPack, sharePackPdf } from '@/features/print/print-pack';
import { useChildProfile } from '@/features/profiles/api';
import { useGeneratePack, useReportPack, useStudyPack } from '@/features/study/api';
import { FicheView } from '@/features/study/fiche-view';
import { supabase } from '@/lib/supabase';

/** Vue parent d'un paquet d'étude : contrôle du contenu, signalement, impression. */
export default function PackScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const task = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task')
        .select('id, child_id, subject, kind, description, reference, due_date')
        .eq('id', taskId)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const child = useChildProfile(task.data?.child_id ?? '');
  const pack = useStudyPack(taskId);
  const generate = useGeneratePack(taskId);
  const report = useReportPack(taskId);
  const [reason, setReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  if (task.isLoading || pack.isLoading || !task.data || !child.data) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const settings = deriveLearningSettings(child.data);
  const content = pack.data?.content;
  const meta = {
    subject: task.data.subject,
    description: task.data.description,
    dueLabel: task.data.due_date ? formatShortDate(task.data.due_date) : null,
  };

  async function runPrint(share: boolean) {
    if (!content) return;
    setPrintError(null);
    try {
      await (share ? sharePackPdf(content, settings, meta) : printPack(content, settings, meta));
    } catch {
      setPrintError("L'impression a échoué. Réessayez.");
    }
  }

  return (
    <Screen>
      <ThemedText type="smallBold">
        {task.data.subject} · {TASK_KIND_LABELS[task.data.kind as keyof typeof TASK_KIND_LABELS]}
      </ThemedText>
      <ThemedText>{task.data.description}</ThemedText>
      <CurriculumLinkCard taskId={task.data.id} grade={child.data.grade} track={child.data.track} />

      {!pack.data ? (
        <>
          <ThemedText themeColor="textSecondary">
            La fiche et le quiz n&apos;ont pas encore été préparés.
          </ThemedText>
          {generate.error ? <ThemedText themeColor="danger">{generate.error.message}</ThemedText> : null}
          <Button
            label="Préparer maintenant"
            loading={generate.isPending}
            onPress={() => generate.mutate(false)}
          />
        </>
      ) : content?.topicUnclear ? (
        <ThemedText>
          La tâche est trop vague pour préparer une fiche. Précisez la description (le sujet de la leçon) puis
          régénérez.
        </ThemedText>
      ) : content ? (
        <>
          <View style={styles.row}>
            <Button label="Imprimer" style={styles.flex} onPress={() => runPrint(false)} />
            <Button
              variant="secondary"
              label="Partager le PDF"
              style={styles.flex}
              onPress={() => runPrint(true)}
            />
          </View>
          {printError ? <ThemedText themeColor="danger">{printError}</ThemedText> : null}
          {content.fiche ? <FicheView fiche={content.fiche} settings={settings} /> : null}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              Quiz ({content.quiz.length}) · exercices ({content.exercises.length}) · cartes (
              {content.flashcards.length})
            </ThemedText>
            {content.quiz.map((q, i) => (
              <ThemedText key={i} type="small">
                {i + 1}. {q.question} → {q.choices[q.answerIndex]}
              </ThemedText>
            ))}
            {content.exercises.map((ex, i) => (
              <ThemedText key={`e${i}`} type="small">
                Ex. {i + 1}. {ex.prompt} → {ex.answer}
              </ThemedText>
            ))}
          </ThemedView>
        </>
      ) : null}

      {pack.data ? (
        <>
          {pack.data.reported_at ? (
            <ThemedText themeColor="warning">
              Erreur signalée. Merci : cela nous aide à améliorer les fiches.
            </ThemedText>
          ) : reporting ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <TextField
                label="Quelle erreur avez-vous vue ?"
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <Button
                label="Envoyer le signalement"
                disabled={reason.trim().length < 3}
                loading={report.isPending}
                onPress={() =>
                  report.mutate(
                    { packId: pack.data!.id, reason: reason.trim() },
                    { onSuccess: () => setReporting(false) },
                  )
                }
              />
            </ThemedView>
          ) : (
            <Button variant="secondary" label="Signaler une erreur" onPress={() => setReporting(true)} />
          )}
          {generate.error ? <ThemedText themeColor="danger">{generate.error.message}</ThemedText> : null}
          <Button
            variant="secondary"
            label="Régénérer la fiche et le quiz"
            loading={generate.isPending}
            onPress={() => generate.mutate(true)}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
