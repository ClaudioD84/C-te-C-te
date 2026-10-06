import { formatRelativeDate, TASK_KIND_LABELS, type IsoDate, type PlannedDay } from '@cote-a-cote/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { UpcomingTask } from '@/features/planning/api';
import { ACTIVITY_LABELS, capitalize } from '@/features/planning/labels';
import { useTheme } from '@/hooks/use-theme';

export type DisplayItem = PlannedDay['items'][number] & { done?: boolean; label?: string };

/** Un jour du planning : activités, durée, coche des activités faites. */
export function DayCard({
  day,
  today,
  taskById,
}: {
  day: { date: IsoDate; totalMinutes: number; items: DisplayItem[] };
  today: IsoDate;
  taskById: Map<string, UpcomingTask>;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.row}>
        <ThemedText type="smallBold">{capitalize(formatRelativeDate(day.date, today))}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {day.totalMinutes} min
        </ThemedText>
      </View>
      {day.items.map((item) => {
        const task = taskById.get(item.taskId);
        const label =
          item.label ??
          (task ? `${task.subject} · ${task.description} (${TASK_KIND_LABELS[task.kind]})` : '');
        return (
          <ThemedText key={item.taskId} type="small" themeColor={item.done ? 'textSecondary' : 'text'}>
            {item.done ? '✓ ' : '• '}
            {ACTIVITY_LABELS[item.activity]} {item.minutes} min — {label}
          </ThemedText>
        );
      })}
    </ThemedView>
  );
}

/** Alerte de charge (F8), encadrée de la couleur d'accent. */
export function AlertBox({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.alert, { borderColor: theme.accent }]}>
      <ThemedText type="small">{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  alert: { borderWidth: 2, borderRadius: Spacing.two, padding: Spacing.three },
});
