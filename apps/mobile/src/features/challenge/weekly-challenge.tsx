import AsyncStorage from '@react-native-async-storage/async-storage';
import { mondayOfWeek, toIsoDate, type LearningSettings } from '@cote-a-cote/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';

const GOALS = [2, 3, 4] as const;
const key = (childId: string) => `defi:${childId}:${mondayOfWeek(toIsoDate(new Date()))}`;

/**
 * Défi de la semaine choisi par l'enfant (jours de travail). Réussi : on le fête ; pas réussi : rien
 * ne se perd, un nouveau défi est proposé lundi. Gardé sur l'appareil, pour la semaine.
 */
export function WeeklyChallenge({
  childId,
  effortDays,
  settings,
}: {
  childId: string;
  effortDays: number;
  settings: LearningSettings;
}) {
  const [goal, setGoal] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(key(childId))
      .then((value) => setGoal(value ? Number(value) : null))
      .catch(() => setGoal(null));
  }, [childId]);

  if (goal === undefined) return null;
  const text = learningTextStyle(settings);

  if (goal === null) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={text}>
          🎯 Ton défi de la semaine : combien de jours veux-tu travailler ?
        </ThemedText>
        <View style={styles.row}>
          {GOALS.map((g) => (
            <Button
              key={g}
              variant="secondary"
              label={`${g} jours`}
              style={styles.flex}
              onPress={() => {
                setGoal(g);
                AsyncStorage.setItem(key(childId), String(g)).catch(() => undefined);
              }}
            />
          ))}
        </View>
      </ThemedView>
    );
  }

  const done = Math.min(effortDays, goal);
  return (
    <ThemedView type={done >= goal ? 'backgroundSelected' : 'backgroundElement'} style={styles.card}>
      <ThemedText style={text} accessibilityLiveRegion="polite">
        {done >= goal
          ? `🏆 Défi réussi : ${goal} jours de travail cette semaine. Bravo !`
          : `🎯 Défi : ${goal} jours cette semaine · ${done} sur ${goal}`}
      </ThemedText>
      <View
        style={styles.row}
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {Array.from({ length: goal }, (_, i) => (
          <ThemedText key={i} style={styles.star}>
            {i < done ? '⭐' : '☆'}
          </ThemedText>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  star: { fontSize: 28, lineHeight: 36 },
});
