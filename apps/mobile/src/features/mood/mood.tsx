import AsyncStorage from '@react-native-async-storage/async-storage';
import { type IsoDate, type LearningSettings } from '@cote-a-cote/shared';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/hooks/use-today';

/**
 * Météo de l'enfant : comment il se sent avant la mission. Fatigué ou pas en forme, la mission est
 * allégée à l'essentiel (rien n'est supprimé du planning). La réponse reste sur l'appareil, pour la journée :
 * c'est un ressenti de l'enfant, il n'est ni envoyé ni montré au parent.
 */
export type Mood = 'forme' | 'fatigue' | 'pas_forme';

export const MOODS: Record<Mood, { emoji: string; label: string; message: string; items: number | null }> = {
  forme: { emoji: '☀️', label: 'En forme', message: 'Super ! On y va.', items: null },
  fatigue: {
    emoji: '⛅',
    label: 'Un peu fatigué',
    message: 'Aujourd’hui, juste l’essentiel. Le reste peut attendre.',
    items: 1,
  },
  pas_forme: {
    emoji: '🌧️',
    label: 'Pas en forme',
    message: 'Ce n’est pas grave. Une seule petite activité si tu veux, ou une pause : tu choisis.',
    items: 1,
  },
};

const key = (childId: string, today: IsoDate) => `meteo:${childId}:${today}`;

export function useTodayMood(childId: string) {
  const today = useToday();
  const [mood, setMood] = useState<Mood | null | undefined>(undefined);
  useEffect(() => {
    // Nouveau jour : la météo est redemandée.
    setMood(undefined);
    AsyncStorage.getItem(key(childId, today))
      .then((value) => setMood(value && value in MOODS ? (value as Mood) : null))
      .catch(() => setMood(null));
  }, [childId, today]);
  const choose = useCallback(
    (value: Mood) => {
      setMood(value);
      AsyncStorage.setItem(key(childId, today), value).catch(() => undefined);
    },
    [childId, today],
  );
  return { mood, choose, loading: mood === undefined };
}

export function MoodPicker({
  onChoose,
  settings,
}: {
  onChoose: (mood: Mood) => void;
  settings: LearningSettings;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={learningTextStyle(settings)}>Comment tu te sens aujourd’hui ?</ThemedText>
      <View style={styles.row}>
        {(Object.keys(MOODS) as Mood[]).map((mood) => (
          <Button
            key={mood}
            variant="secondary"
            label={`${MOODS[mood].emoji} ${MOODS[mood].label}`}
            style={styles.choice}
            onPress={() => onChoose(mood)}
          />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choice: { flexGrow: 1, minWidth: 140 },
});
