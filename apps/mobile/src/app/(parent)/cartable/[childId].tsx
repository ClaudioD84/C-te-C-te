import { BAG_PRESETS, SCHOOL_DAYS, WEEKDAY_LABELS, WEEKDAYS, type Weekday } from '@cote-a-cote/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChildProfile } from '@/features/profiles/api';
import { useAddBagItem, useRemoveBagItem, useSchoolBag } from '@/features/school-bag/api';

/** Le parent note ce qu'il faut emporter, et quels jours ; l'enfant coche sa liste la veille au soir. */
export default function SchoolBagScreen() {
  const { childId = '' } = useLocalSearchParams<{ childId: string }>();
  const child = useChildProfile(childId);
  const bag = useSchoolBag(childId);
  const add = useAddBagItem(childId);
  const remove = useRemoveBagItem(childId);
  const [label, setLabel] = useState('');
  const [days, setDays] = useState<Weekday[]>([]);
  const alias = child.data?.alias ?? 'votre enfant';
  const presets = BAG_PRESETS.filter((p) => !bag.data?.some((item) => item.label === p.label));

  return (
    <Screen>
      <ThemedText type="subtitle">Le cartable de {alias}</ThemedText>
      <ThemedText themeColor="textSecondary">
        Chaque soir, {alias} coche sur sa console ce qu’il faut emporter le lendemain (le matin même avant 10
        h).
      </ThemedText>

      {bag.data && bag.data.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          {bag.data.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.text}>
                <ThemedText>{item.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.days.length === 5 && SCHOOL_DAYS.every((d) => item.days.includes(d))
                    ? 'Tous les jours d’école'
                    : WEEKDAYS.filter((d) => item.days.includes(d))
                        .map((d) => WEEKDAY_LABELS[d])
                        .join(', ')}
                </ThemedText>
              </View>
              <Button
                variant="secondary"
                label="Retirer"
                accessibilityLabel={`Retirer ${item.label}`}
                onPress={() => remove.mutate(item.id)}
              />
            </View>
          ))}
        </ThemedView>
      ) : null}

      {presets.length > 0 ? (
        <ChoiceChips
          label="Idées"
          options={presets.map((p) => p.label)}
          labels={Object.fromEntries(presets.map((p) => [p.label, p.label]))}
          selected={presets.filter((p) => p.label === label).map((p) => p.label)}
          onToggle={(choice) => {
            setLabel(choice);
            setDays([...(BAG_PRESETS.find((p) => p.label === choice)?.days ?? [])]);
          }}
        />
      ) : null}
      <TextField label="À emporter" value={label} onChangeText={setLabel} maxLength={40} />
      <ChoiceChips
        label="Quels jours ?"
        options={WEEKDAYS}
        labels={WEEKDAY_LABELS}
        selected={days}
        onToggle={(d) =>
          setDays((current) => (current.includes(d) ? current.filter((x) => x !== d) : [...current, d]))
        }
        multiple
      />
      {add.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          L’ajout a échoué. Vérifiez votre connexion.
        </ThemedText>
      ) : null}
      <Button
        label="Ajouter au cartable"
        disabled={label.trim().length === 0 || days.length === 0}
        loading={add.isPending}
        onPress={() =>
          add.mutate(
            { label, days },
            {
              onSuccess: () => {
                setLabel('');
                setDays([]);
              },
            },
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { flex: 1 },
});
