import { formatShortDate, LOW_CONFIDENCE_THRESHOLD, TASK_KIND_LABELS } from '@cote-a-cote/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ScanWordsCard } from '@/features/spelling/scan-words-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  useAbandonScan,
  useDeleteTask,
  useProcessScan,
  useSaveTask,
  useScan,
  useScanTasks,
  useValidateScan,
  type TaskRow,
} from '@/features/scan/api';
import { TaskForm } from '@/features/scan/task-form';
import { useTheme } from '@/hooks/use-theme';

/** Écran de validation (F3) : rien n'est planifié avant que le parent ait relu la liste. */
export default function ScanReviewScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const scan = useScan(scanId);
  const tasks = useScanTasks(scanId);
  const process = useProcessScan(scanId);
  const validate = useValidateScan(scanId);
  const abandon = useAbandonScan(scanId);
  const started = useRef(false);

  // Lance l'analyse automatiquement à l'arrivée sur l'écran.
  const status = scan.data?.status;
  useEffect(() => {
    if (status === 'uploaded' && !started.current) {
      started.current = true;
      process.mutate();
    }
  }, [status, process]);

  const analysing = status === 'uploaded' || status === 'processing';
  if (scan.isLoading || process.isPending || (analysing && !process.isError)) {
    return (
      <Screen>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.center}>Lecture de la photo en cours…</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Cela prend généralement moins de 20 secondes.
        </ThemedText>
      </Screen>
    );
  }

  if (!scan.data || status === 'failed') {
    return (
      <Screen>
        <ThemedText themeColor="danger">{scan.data?.error ?? "L'analyse de la photo a échoué."}</ThemedText>
        <Button label="Réessayer" onPress={() => process.mutate()} />
        <Button variant="secondary" label="Abandonner" onPress={() => router.back()} />
      </Screen>
    );
  }

  const childId = scan.data.child_id;
  const readOnly = status === 'validated';

  return (
    <Screen>
      <ThemedText>
        {readOnly
          ? 'Cette liste a été validée.'
          : 'Vérifiez ce que nous avons lu. Corrigez, supprimez ou ajoutez des tâches, puis validez.'}
      </ThemedText>

      {tasks.data?.length === 0 ? (
        <ThemedText themeColor="textSecondary">Aucune tâche trouvée sur cette photo.</ThemedText>
      ) : null}
      {tasks.data?.map((task) => (
        <TaskCard key={task.id} task={task} scanId={scanId} childId={childId} readOnly={readOnly} />
      ))}

      {scan.data.spelling_words && scan.data.spelling_words.length > 0 ? (
        <ScanWordsCard childId={childId} words={scan.data.spelling_words} />
      ) : null}

      {readOnly ? (
        <Button label="Retour au cockpit" onPress={() => router.dismissTo('/')} />
      ) : (
        <>
          <NewTask scanId={scanId} childId={childId} />
          {validate.error ? (
            <ThemedText themeColor="danger">La validation a échoué. Réessayez.</ThemedText>
          ) : null}
          <Button
            label="Valider la liste"
            loading={validate.isPending}
            onPress={() => validate.mutate(undefined, { onSuccess: () => router.dismissTo('/') })}
          />
        </>
      )}
    </Screen>
  );
}

function TaskCard({
  task,
  scanId,
  childId,
  readOnly,
}: {
  task: TaskRow;
  scanId: string;
  childId: string;
  readOnly: boolean;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const save = useSaveTask(scanId);
  const remove = useDeleteTask(scanId);
  const uncertain = task.status === 'draft' && (task.confidence ?? 1) < LOW_CONFIDENCE_THRESHOLD;

  if (editing) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <TaskForm
          initial={task}
          saving={save.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(draft) =>
            save.mutate({ id: task.id, childId, draft }, { onSuccess: () => setEditing(false) })
          }
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, uncertain && { borderColor: theme.accent, borderWidth: 2 }]}>
      <ThemedText type="smallBold">
        {task.subject} · {TASK_KIND_LABELS[task.kind]}
      </ThemedText>
      <ThemedText>{task.description}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {task.due_date ? `Pour le ${formatShortDate(task.due_date)}` : 'Sans date'}
        {task.reference ? ` · ${task.reference}` : ''}
      </ThemedText>
      {uncertain ? (
        <ThemedText type="small" themeColor="warning">
          Lecture incertaine : vérifiez cette tâche.
        </ThemedText>
      ) : null}
      {readOnly ? null : (
        <View style={styles.row}>
          <Button variant="secondary" label="Modifier" style={styles.flex} onPress={() => setEditing(true)} />
          <Button
            variant="secondary"
            label="Supprimer"
            style={styles.flex}
            loading={remove.isPending}
            onPress={() => remove.mutate(task.id)}
          />
        </View>
      )}
    </ThemedView>
  );
}

function NewTask({ scanId, childId }: { scanId: string; childId: string }) {
  const [open, setOpen] = useState(false);
  const save = useSaveTask(scanId);

  if (!open) return <Button variant="secondary" label="Ajouter une tâche" onPress={() => setOpen(true)} />;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <TaskForm
        saving={save.isPending}
        onCancel={() => setOpen(false)}
        onSubmit={(draft) => save.mutate({ childId, draft }, { onSuccess: () => setOpen(false) })}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
