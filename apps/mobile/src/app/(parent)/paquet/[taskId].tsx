import {
  deriveLearningSettings,
  formatShortDate,
  neutralFeedback,
  TASK_KIND_LABELS,
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
import { CurriculumLinkCard } from '@/features/curriculum/curriculum-link';
import { printPack, sharePackPdf } from '@/features/print/print-pack';
import { useRemoveTask } from '@/features/planning/api';
import { useChildProfile } from '@/features/profiles/api';
import {
  useDeletePack,
  useGeneratePack,
  useRemovePackItem,
  useReportPack,
  useStudyPack,
  type PackPart,
} from '@/features/study/api';
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
  const removeItem = useRemovePackItem(taskId);
  const deletePack = useDeletePack(taskId);
  const removeTask = useRemoveTask(task.data?.child_id ?? '');
  const [confirmDelete, setConfirmDelete] = useState<'fiche' | 'tache' | null>(null);
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

  /** « Retirer » sur un élément de la fiche (le texte attendu évite de retirer le mauvais si elle a changé). */
  const remover = (part: PackPart, index: number, expected: string, what: string) => (
    <Button
      variant="secondary"
      label="Retirer"
      accessibilityLabel={`Retirer ${what}`}
      disabled={removeItem.isPending}
      onPress={() => removeItem.mutate({ packId: pack.data!.id, part, index, expected })}
    />
  );

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
          {content.quiz.length === 0 && content.exercises.length === 0 && content.flashcards.length > 0 ? (
            // Liste de vocabulaire photographiée : des cartes de mots seulement.
            <>
              <ThemedText themeColor="textSecondary">
                Liste de vocabulaire : des cartes de mots seulement. L&apos;IA peut la compléter d&apos;un
                quiz, d&apos;exercices et de cartes de phrases avec ces mots ; les cartes et la progression
                restent.
              </ThemedText>
              {generate.error ? <ThemedText themeColor="danger">{generate.error.message}</ThemedText> : null}
              <Button
                label="Compléter avec un quiz et des exercices"
                loading={generate.isPending}
                onPress={() => generate.mutate(false)}
              />
            </>
          ) : null}
          {content.fiche ? <FicheView fiche={content.fiche} settings={settings} /> : null}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">
              Quiz ({content.quiz.length}) · exercices ({content.exercises.length}) · cartes (
              {content.flashcards.length})
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Une question, un exercice ou une carte qui ne convient pas peut être retiré.
            </ThemedText>
            {removeItem.error ? (
              <ThemedText type="small" themeColor="danger">
                {removeItem.error.message}
              </ThemedText>
            ) : null}
            {content.quiz.map((q, i) => (
              <View key={`q${i}`} style={styles.item}>
                <ThemedText type="small" style={styles.flex}>
                  {i + 1}. {q.question} → {q.choices[q.answerIndex]}
                </ThemedText>
                {remover('quiz', i, q.question, `la question ${i + 1} du quiz`)}
              </View>
            ))}
            {content.exercises.map((ex, i) => (
              <View key={`e${i}`} style={styles.item}>
                <ThemedText type="small" style={styles.flex}>
                  Ex. {i + 1}
                  {ex.steps.length > 0 ? ' (guidé)' : ''}. {ex.prompt} → {neutralFeedback(ex.answer)}
                  {ex.steps.length > 0 ? `\n   Étapes : ${ex.steps.join(' · ')}` : ''}
                </ThemedText>
                {remover('exercises', i, ex.prompt, `l’exercice ${i + 1}`)}
              </View>
            ))}
            {content.flashcards.map((card, i) => (
              <View key={`c${i}`} style={styles.item}>
                <ThemedText type="small" style={styles.flex}>
                  Carte : {card.front} → {card.back}
                </ThemedText>
                {remover('flashcards', i, card.front, `la carte « ${card.front} »`)}
              </View>
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

      {confirmDelete ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText>
            {confirmDelete === 'fiche'
              ? 'La fiche, le quiz et les cartes de cette tâche seront supprimés. Une nouvelle fiche ne sera préparée que si votre enfant ouvre la leçon.'
              : 'La tâche sera retirée du planning, avec sa fiche, son quiz et ses cartes.'}
          </ThemedText>
          {deletePack.error || removeTask.error ? (
            <ThemedText themeColor="danger">{(deletePack.error ?? removeTask.error)!.message}</ThemedText>
          ) : null}
          <Button
            label={
              confirmDelete === 'fiche' ? 'Confirmer : supprimer la fiche' : 'Confirmer : supprimer la tâche'
            }
            loading={deletePack.isPending || removeTask.isPending}
            onPress={() =>
              confirmDelete === 'fiche'
                ? deletePack.mutate(pack.data!.id, { onSuccess: () => setConfirmDelete(null) })
                : removeTask.mutate({ id: taskId, mode: 'supprimer' }, { onSuccess: () => router.back() })
            }
          />
          <Button variant="secondary" label="Annuler" onPress={() => setConfirmDelete(null)} />
        </ThemedView>
      ) : (
        <View style={styles.row}>
          {pack.data ? (
            <Button
              variant="secondary"
              label="Supprimer la fiche"
              style={styles.flex}
              onPress={() => setConfirmDelete('fiche')}
            />
          ) : null}
          <Button
            variant="secondary"
            label="Supprimer la tâche"
            style={styles.flex}
            onPress={() => setConfirmDelete('tache')}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
