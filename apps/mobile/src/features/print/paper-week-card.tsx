import { deriveLearningSettings, formatShortDate } from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { StudySession, UpcomingTask } from '@/features/planning/api';
import type { StoredChildProfile } from '@/features/profiles/api';
import { usePacksForTasks } from '@/features/study/api';

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
  const [printError, setPrintError] = useState<string | null>(null);
  // Fiches des tâches prévues dans le planning publié.
  const plannedTaskIds = [...new Set(sessions.flatMap((s) => s.study_session_task.map((i) => i.task_id)))];
  const packs = usePacksForTasks(plannedTaskIds);

  if (!packs.data || packs.data.length === 0) return null;
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Version papier</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {profile.preferences.prefersPaper
          ? `${profile.alias} préfère travailler sur papier : imprimez les fiches de la semaine en une fois.`
          : 'Toutes les fiches de la semaine dans un seul document, chacune avec ses réponses à part.'}
      </ThemedText>
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
      {printError ? <ThemedText themeColor="danger">{printError}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
