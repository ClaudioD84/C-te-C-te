import {
  DAY_OFF_KINDS,
  DAY_OFF_LABELS,
  daysBetween,
  formatShortDate,
  MAX_DAY_OFF_DAYS,
  type DayOffKind,
  type IsoDate,
} from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { DatePicker } from '@/components/date-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { useAddDayOff, useDaysOff, useRemoveDayOff } from './api';

function periodLabel(start: IsoDate, end: IsoDate): string {
  return start === end
    ? `le ${formatShortDate(start)}`
    : `du ${formatShortDate(start)} au ${formatShortDate(end)}`;
}

/** Congés et absences : le planning ne prévoit rien ces jours-là. */
export function DaysOffCard({ childId }: { childId: string }) {
  const daysOff = useDaysOff(childId);
  const add = useAddDayOff(childId);
  const remove = useRemoveDayOff(childId);
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState<IsoDate | null>(null);
  const [end, setEnd] = useState<IsoDate | null>(null);
  const [kind, setKind] = useState<DayOffKind>('conge');

  const length = start && end ? daysBetween(start, end) : -1;
  const invalid = start !== null && end !== null && (length < 0 || length >= MAX_DAY_OFF_DAYS);

  async function save() {
    if (!start) return;
    await add.mutateAsync({ start, end: end ?? start, kind });
    setAdding(false);
    setStart(null);
    setEnd(null);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Congés et absences</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Aucun travail n’est prévu ces jours-là ; la préparation est avancée quand c’est possible.
      </ThemedText>
      {daysOff.data?.map((d) => (
        <View key={d.id} style={styles.row}>
          <ThemedText style={styles.flex}>
            {DAY_OFF_LABELS[d.kind]} {periodLabel(d.start, d.end)}
          </ThemedText>
          <Button
            variant="secondary"
            label="Retirer"
            accessibilityLabel={`Retirer ${DAY_OFF_LABELS[d.kind]} ${periodLabel(d.start, d.end)}`}
            onPress={() => remove.mutate(d.id)}
          />
        </View>
      ))}
      {adding ? (
        <>
          <ChoiceChips
            label="Type"
            options={DAY_OFF_KINDS}
            labels={DAY_OFF_LABELS}
            selected={[kind]}
            onToggle={setKind}
          />
          <DatePicker
            label="Premier jour"
            value={start}
            includeToday
            onChange={(d) => {
              setStart(d);
              if (!end || end < d) setEnd(d);
            }}
          />
          {start ? <DatePicker label="Dernier jour" value={end} onChange={setEnd} includeToday /> : null}
          {invalid ? (
            <ThemedText themeColor="danger">
              Le dernier jour doit suivre le premier, sur {MAX_DAY_OFF_DAYS} jours au plus.
            </ThemedText>
          ) : null}
          {add.error ? (
            <ThemedText themeColor="danger" accessibilityRole="alert">
              L’enregistrement a échoué. Vérifiez votre connexion.
            </ThemedText>
          ) : null}
          <Button
            label={start ? `Enregistrer (${periodLabel(start, end ?? start)})` : 'Enregistrer'}
            disabled={!start || invalid}
            loading={add.isPending}
            onPress={save}
          />
          <Button variant="secondary" label="Annuler" onPress={() => setAdding(false)} />
        </>
      ) : (
        <Button variant="secondary" label="Ajouter un congé ou une absence" onPress={() => setAdding(true)} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
