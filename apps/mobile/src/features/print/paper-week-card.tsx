import { deriveLearningSettings, formatShortDate, needsStudyPack } from '@cote-a-cote/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { StudySession, UpcomingTask } from '@/features/planning/api';
import type { StoredChildProfile } from '@/features/profiles/api';
import { preparePacks, usePacksForTasks } from '@/features/study/api';

import { printPacks } from './print-pack';

/**
 * Planning : toutes les fiches de la semaine publiée dans un seul document (F10), mis en avant quand l'enfant
 * préfère travailler sur papier.
 */
export function PaperWeekCard({
  profile,
  tasks,
  sessions,
}: {
  profile: StoredChildProfile;
  tasks: readonly UpcomingTask[];
  sessions: readonly StudySession[];
}) {
  const queryClient = useQueryClient();
  const [printError, setPrintError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<{ done: number; total: number } | null>(null);
  // Fiches des tâches prévues dans le planning publié.
  const plannedTaskIds = [...new Set(sessions.flatMap((s) => s.study_session_task.map((i) => i.task_id)))];
  const packs = usePacksForTasks(plannedTaskIds);
  // Fiches préparées à la demande : celles qui manquent encore pour imprimer la semaine.
  const studyTaskIds = [
    ...new Set(
      sessions.flatMap((s) =>
        s.study_session_task
          .filter((i) => i.activity !== 'faire' && needsStudyPack(i.task))
          .map((i) => i.task_id),
      ),
    ),
  ];
  const ready = new Set((packs.data ?? []).map((p) => p.task_id));
  const missing = studyTaskIds.filter((id) => !ready.has(id));

  if (!packs.data || (packs.data.length === 0 && missing.length === 0)) return null;
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Version papier</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {profile.preferences.prefersPaper
          ? `${profile.alias} préfère travailler sur papier : imprimez les fiches de la semaine en une fois.`
          : 'Toutes les fiches de la semaine dans un seul document, chacune avec ses réponses à part.'}
      </ThemedText>
      {missing.length > 0 ? (
        <Button
          variant="secondary"
          label={
            preparing
              ? `Préparation : ${preparing.done} sur ${preparing.total}…`
              : `Préparer les fiches à imprimer (${missing.length})`
          }
          disabled={preparing !== null}
          onPress={() => {
            setPreparing({ done: 0, total: missing.length });
            void preparePacks(missing, (done) => setPreparing({ done, total: missing.length })).finally(
              () => {
                setPreparing(null);
                void queryClient.invalidateQueries({ queryKey: ['study_packs'] });
              },
            );
          }}
        />
      ) : null}
      {packs.data.length > 0 ? (
        <Button
          variant={profile.preferences.prefersPaper ? 'primary' : 'secondary'}
          label={`Imprimer les fiches de la semaine (${packs.data.length})`}
          onPress={async () => {
            setPrintError(null);
            const byTask = new Map(tasks.map((t) => [t.id, t]));
            const items = packs
              .data!.filter((p) => !p.content.topicUnclear && byTask.has(p.task_id))
              .sort((a, b) => byTask.get(a.task_id)!.dueDate.localeCompare(byTask.get(b.task_id)!.dueDate))
              .map((p) => {
                const task = byTask.get(p.task_id)!;
                return {
                  pack: p.content,
                  meta: {
                    subject: task.subject,
                    description: task.description,
                    dueLabel: formatShortDate(task.dueDate),
                  },
                };
              });
            try {
              await printPacks(items, deriveLearningSettings(profile));
            } catch {
              setPrintError("L'impression a échoué. Réessayez.");
            }
          }}
        />
      ) : null}
      {printError ? <ThemedText themeColor="danger">{printError}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
