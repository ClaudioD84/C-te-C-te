import type { Exercise, LearningSettings } from '@cote-a-cote/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';

/** Exercices à faire sur papier ou de tête, avec indice et réponse à découvrir. */
export function ExerciseList({ exercises, settings }: { exercises: Exercise[]; settings: LearningSettings }) {
  const pageSize = Math.max(1, settings.maxItemsPerScreen);
  const [offset, setOffset] = useState(0);
  const page = exercises.slice(offset, offset + pageSize);

  return (
    <View style={styles.container}>
      {page.map((exercise, i) => (
        <ExerciseCard key={offset + i} exercise={exercise} number={offset + i + 1} settings={settings} />
      ))}
      {offset + page.length < exercises.length ? (
        <Button label="Exercice suivant" onPress={() => setOffset(offset + page.length)} />
      ) : (
        <ThemedText themeColor="textSecondary">Tu as vu tous les exercices.</ThemedText>
      )}
    </View>
  );
}

function ExerciseCard({
  exercise,
  number,
  settings,
}: {
  exercise: Exercise;
  number: number;
  settings: LearningSettings;
}) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const text = learningTextStyle(settings, 18);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" themeColor="primary">
        Exercice {number}
      </ThemedText>
      <ThemedText style={text}>{exercise.instruction}</ThemedText>
      <ThemedText style={[text, styles.prompt]}>{exercise.prompt}</ThemedText>
      {showHint && exercise.hint ? <ThemedText style={text}>Indice : {exercise.hint}</ThemedText> : null}
      {showAnswer ? <ThemedText style={[text, styles.answer]}>Réponse : {exercise.answer}</ThemedText> : null}
      <View style={styles.row}>
        {exercise.hint && !showHint ? (
          <Button
            variant="secondary"
            label="Un indice"
            style={styles.flex}
            onPress={() => setShowHint(true)}
          />
        ) : null}
        {!showAnswer ? (
          <Button
            variant="secondary"
            label="Voir la réponse"
            style={styles.flex}
            onPress={() => setShowAnswer(true)}
          />
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
  prompt: { fontWeight: 600 },
  answer: { fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
