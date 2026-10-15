import { formatRelativeDate, formatShortDate, type IsoDate, type PlannedDay } from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ACTIVITY_LABELS, capitalize } from '@/features/planning/labels';

export interface DayEdits {
  onMinutes: (taskId: string, minutes: number) => void;
  onMove: (taskId: string, to: IsoDate) => void;
  onRemove: (taskId: string) => void;
  onAdd: (taskId: string) => void;
}

/**
 * Un jour de la proposition, retouchable par le parent : durée, jour, retrait de chaque activité, ajout d'une
 * tâche. Un jour de congé reste vide.
 */
export function EditableDayCard({
  date,
  day,
  today,
  capacity,
  blocked,
  otherDates,
  tasks,
  labelOf,
  edits,
}: {
  date: IsoDate;
  day: PlannedDay | undefined;
  today: IsoDate;
  /** Temps de travail prévu par jour. */
  capacity: number;
  blocked: boolean;
  /** Jours vers lesquels une activité peut être déplacée. */
  otherDates: IsoDate[];
  /** Tâches qui peuvent être ajoutées. */
  tasks: readonly { id: string }[];
  labelOf: (taskId: string) => string;
  edits: DayEdits;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const dayLabel = capitalize(formatRelativeDate(date, today));
  const total = day?.totalMinutes ?? 0;
  const addable = tasks.filter((task) => !day?.items.some((item) => item.taskId === task.id));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="smallBold">{dayLabel}</ThemedText>
        {blocked ? null : (
          <ThemedText type="small" themeColor={total > capacity ? 'danger' : 'textSecondary'}>
            {total} / {capacity} min
          </ThemedText>
        )}
      </View>
      {blocked ? (
        <ThemedText type="small" themeColor="textSecondary">
          Congé : pas de travail.
        </ThemedText>
      ) : null}
      {!blocked && !day ? (
        <ThemedText type="small" themeColor="textSecondary">
          Rien de prévu.
        </ThemedText>
      ) : null}

      {day?.items.map((item) => {
        const label = labelOf(item.taskId);
        const open = editing === item.taskId;
        return (
          <View key={item.taskId} style={styles.item}>
            <View style={styles.itemRow}>
              <ThemedText type="small" style={styles.flex}>
                • {ACTIVITY_LABELS[item.activity]} {item.minutes} min — {label}
              </ThemedText>
              <Button
                variant="secondary"
                label={open ? 'Fermer' : 'Modifier'}
                accessibilityLabel={`${open ? 'Fermer' : 'Modifier'} : ${label}, ${dayLabel.toLowerCase()}`}
                aria-expanded={open}
                onPress={() => setEditing(open ? null : item.taskId)}
              />
            </View>
            {open ? (
              <View style={styles.editor}>
                <View style={styles.itemRow}>
                  <Button
                    variant="secondary"
                    label="− 5 min"
                    accessibilityLabel="Raccourcir de 5 minutes"
                    disabled={item.minutes <= 5}
                    onPress={() => edits.onMinutes(item.taskId, item.minutes - 5)}
                  />
                  <ThemedText type="smallBold">{item.minutes} min</ThemedText>
                  <Button
                    variant="secondary"
                    label="+ 5 min"
                    accessibilityLabel="Allonger de 5 minutes"
                    onPress={() => edits.onMinutes(item.taskId, item.minutes + 5)}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Déplacer vers :
                </ThemedText>
                <View style={styles.wrap}>
                  {otherDates.map((other) => (
                    <Button
                      key={other}
                      variant="secondary"
                      label={formatShortDate(other)}
                      accessibilityLabel={`Déplacer vers ${formatRelativeDate(other, today)}`}
                      onPress={() => {
                        setEditing(null);
                        edits.onMove(item.taskId, other);
                      }}
                    />
                  ))}
                </View>
                <Button
                  variant="secondary"
                  label="Retirer de ce jour"
                  onPress={() => {
                    setEditing(null);
                    edits.onRemove(item.taskId);
                  }}
                />
              </View>
            ) : null}
          </View>
        );
      })}

      {!blocked && addable.length > 0 ? (
        <>
          <Button
            variant="secondary"
            label={adding ? 'Fermer' : '＋ Ajouter une tâche'}
            accessibilityLabel={adding ? 'Fermer' : `Ajouter une tâche, ${dayLabel.toLowerCase()}`}
            aria-expanded={adding}
            onPress={() => setAdding(!adding)}
          />
          {adding
            ? addable.map((task) => (
                <Button
                  key={task.id}
                  variant="secondary"
                  label={labelOf(task.id)}
                  accessibilityLabel={`Ajouter ${labelOf(task.id)}, ${dayLabel.toLowerCase()}`}
                  onPress={() => {
                    setAdding(false);
                    edits.onAdd(task.id);
                  }}
                />
              ))
            : null}
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { gap: Spacing.two },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  editor: { gap: Spacing.two, paddingLeft: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
