import {
  formatShortDate,
  TASK_KIND_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type IsoDate,
  type TaskKind,
  type TaskPriority,
} from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { DayPicker } from '@/components/day-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useUndatedTasks, useUpdateTaskPlanning, type UpcomingTask } from '@/features/planning/api';

interface TaskSummary {
  id: string;
  subject: string;
  kind: TaskKind;
  description: string;
  dueDate: IsoDate | null;
  priority: TaskPriority;
}

/**
 * Ce qui doit être fait et pour quand : le parent règle la priorité et l'échéance de chaque tâche avant de
 * calculer le planning. Une tâche sans date n'entre dans le planning qu'une fois datée.
 */
export function TaskPrioritiesCard({ childId, tasks }: { childId: string; tasks: readonly UpcomingTask[] }) {
  const undated = useUndatedTasks(childId);
  const update = useUpdateTaskPlanning(childId);
  const all: TaskSummary[] = [
    ...tasks
      .filter((task) => !task.mockExam)
      .map((task) => ({ ...task, priority: task.priority ?? 'normale' })),
    ...(undated.data ?? []).map((task) => ({ ...task, dueDate: null })),
  ];
  if (all.length === 0) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Priorités et échéances</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Le planning en tient compte au prochain calcul.
      </ThemedText>
      {update.error ? (
        <ThemedText type="small" themeColor="danger">
          La modification a échoué. Réessayez.
        </ThemedText>
      ) : null}
      {all.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onPriority={(priority) => update.mutate({ id: task.id, patch: { priority } })}
          onDueDate={(due_date) => update.mutate({ id: task.id, patch: { due_date } })}
        />
      ))}
    </ThemedView>
  );
}

function TaskRow({
  task,
  onPriority,
  onDueDate,
}: {
  task: TaskSummary;
  onPriority: (priority: TaskPriority) => void;
  onDueDate: (date: IsoDate | null) => void;
}) {
  const [choosingDate, setChoosingDate] = useState(false);
  const label = `${task.subject} · ${task.description}`;
  return (
    <View style={styles.task}>
      <ThemedText type="small">
        {label} ({TASK_KIND_LABELS[task.kind]})
      </ThemedText>
      <ThemedText type="small" themeColor={task.dueDate ? 'textSecondary' : 'warning'}>
        {task.dueDate
          ? `Pour le ${formatShortDate(task.dueDate)}`
          : 'Sans date : pas encore dans le planning'}
      </ThemedText>
      <ChoiceChips
        label={`Priorité : ${label}`}
        options={TASK_PRIORITIES}
        labels={TASK_PRIORITY_LABELS}
        selected={[task.priority]}
        onToggle={onPriority}
      />
      {choosingDate ? (
        <DayPicker
          label={`Pour quand ? ${label}`}
          value={task.dueDate}
          onChange={(date) => {
            setChoosingDate(false);
            onDueDate(date);
          }}
        />
      ) : (
        <Button
          variant="secondary"
          label={task.dueDate ? 'Changer la date' : 'Choisir une date'}
          accessibilityLabel={`${task.dueDate ? 'Changer la date' : 'Choisir une date'} : ${label}`}
          onPress={() => setChoosingDate(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
  task: { gap: Spacing.two },
});
