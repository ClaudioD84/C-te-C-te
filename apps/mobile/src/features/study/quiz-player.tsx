import type { LearningSettings, QuizQuestion } from '@cote-a-cote/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { MinTouchSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Quiz une question à la fois, avec explication après chaque réponse. */
export function QuizPlayer({
  questions,
  settings,
  onFinish,
}: {
  questions: QuizQuestion[];
  settings: LearningSettings;
  /** Appelé une fois à la fin du quiz (enregistrement de l'effort). */
  onFinish?: (score: number, total: number) => void;
}) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const text = learningTextStyle(settings, 18);

  if (index >= questions.length) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="subtitle">Quiz terminé !</ThemedText>
        <ThemedText style={text}>
          {score} bonne{score > 1 ? 's' : ''} réponse{score > 1 ? 's' : ''} sur {questions.length}. Bravo pour
          ton effort !
        </ThemedText>
        <Button
          variant="secondary"
          label="Recommencer"
          onPress={() => {
            setIndex(0);
            setChosen(null);
            setScore(0);
          }}
        />
      </ThemedView>
    );
  }

  const question = questions[index]!;
  const answered = chosen !== null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary">
        Question {index + 1} sur {questions.length}
      </ThemedText>
      <ThemedText style={text}>{question.question}</ThemedText>
      {question.choices.map((choice, i) => {
        const isAnswer = i === question.answerIndex;
        const background = !answered
          ? theme.background
          : isAnswer
            ? theme.primary
            : i === chosen
              ? theme.danger
              : theme.background;
        const color = answered && (isAnswer || i === chosen) ? theme.onPrimary : theme.text;
        const mark = !answered ? '' : isAnswer ? '✓ ' : i === chosen ? '✗ ' : '';
        const status = !answered ? '' : isAnswer ? ', bonne réponse' : i === chosen ? ', ta réponse' : '';
        return (
          <Pressable
            key={choice}
            disabled={answered}
            accessibilityRole="button"
            accessibilityLabel={`${choice}${status}`}
            accessibilityState={{ disabled: answered, selected: i === chosen }}
            onPress={() => {
              setChosen(i);
              if (isAnswer) setScore((s) => s + 1);
            }}
            style={[styles.choice, { backgroundColor: background, borderColor: theme.border }]}>
            <ThemedText style={[text, { color }]}>
              {mark}
              {choice}
            </ThemedText>
          </Pressable>
        );
      })}
      {answered ? (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <ThemedText type="smallBold">
            {chosen === question.answerIndex ? 'Bonne réponse !' : 'Pas tout à fait.'}
          </ThemedText>
          <ThemedText style={text}>{question.explanation}</ThemedText>
          <Button
            label={index + 1 < questions.length ? 'Question suivante' : 'Voir le résultat'}
            onPress={() => {
              if (index + 1 === questions.length) onFinish?.(score, questions.length);
              setIndex(index + 1);
              setChosen(null);
            }}
          />
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  choice: {
    minHeight: MinTouchSize + 8,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
  },
  feedback: { gap: Spacing.two },
});
