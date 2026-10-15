import { TASK_KIND_LABELS, TASK_KINDS } from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { DayPicker } from '@/components/day-picker';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';

import type { TaskDraft } from './api';

interface TaskFormProps {
  initial?: TaskDraft;
  saving?: boolean;
  onSubmit: (draft: TaskDraft) => void;
  onCancel: () => void;
}

const EMPTY: TaskDraft = { subject: '', kind: 'devoir', description: '', due_date: null, reference: null };

export function TaskForm({ initial = EMPTY, saving, onSubmit, onCancel }: TaskFormProps) {
  const [draft, setDraft] = useState<TaskDraft>(initial);
  const update = (patch: Partial<TaskDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const valid = draft.subject.trim().length > 0 && draft.description.trim().length > 0;

  return (
    <View style={styles.container}>
      <TextField label="Matière" value={draft.subject} onChangeText={(subject) => update({ subject })} />
      <ChoiceChips
        label="Type"
        options={TASK_KINDS}
        labels={TASK_KIND_LABELS}
        selected={[draft.kind]}
        onToggle={(kind) => update({ kind })}
      />
      <TextField
        label="À faire"
        value={draft.description}
        onChangeText={(description) => update({ description })}
        multiline
      />
      <DayPicker label="Pour quand ?" value={draft.due_date} onChange={(due_date) => update({ due_date })} />
      <TextField
        label="Pages ou exercices (facultatif)"
        value={draft.reference ?? ''}
        onChangeText={(reference) => update({ reference: reference || null })}
      />
      <View style={styles.actions}>
        <Button variant="secondary" label="Annuler" onPress={onCancel} style={styles.flex} />
        <Button
          label="Enregistrer"
          loading={saving}
          disabled={!valid}
          style={styles.flex}
          onPress={() =>
            onSubmit({ ...draft, subject: draft.subject.trim(), description: draft.description.trim() })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
