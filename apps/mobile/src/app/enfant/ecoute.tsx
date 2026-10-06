import {
  deriveLearningSettings,
  languageName,
  listeningRound,
  seededRng,
  speechLanguage,
  type ListeningQuestion,
} from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { useLanguageCards, useLogPractice } from '@/features/study/api';

/** « Écoute et choisis » : le mot est lu dans la langue étudiée, l'enfant choisit son sens. */
export default function ListeningScreen() {
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  const cards = useLanguageCards(childId);
  const logPractice = useLogPractice(childId);
  const [seed] = useState(() => String(Date.now()));
  const [round, setRound] = useState<ListeningQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  if (!child.data || cards.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  const settings = deriveLearningSettings(child.data);
  const questions = round ?? listeningRound(cards.data ?? [], seededRng(seed));
  const speak = (q: ListeningQuestion) =>
    Speech.speak(q.card.back, { language: speechLanguage(q.card.subject), rate: 0.85 });

  if (questions.length === 0) {
    return (
      <ChildScreen style={[styles.container, styles.center]}>
        <ThemedText style={styles.centerText}>
          Il faut au moins 4 cartes de vocabulaire d’une langue pour jouer.
        </ThemedText>
        <Button label="Retour à la mission" onPress={() => router.back()} />
      </ChildScreen>
    );
  }

  if (index >= questions.length) {
    return (
      <ChildScreen style={[styles.container, styles.center]}>
        <ThemedText type="subtitle" style={styles.centerText} accessibilityLiveRegion="polite">
          Bravo, tu as bien écouté ! {score} sur {questions.length}.
        </ThemedText>
        <Button label="Retour à la mission" onPress={() => router.back()} />
      </ChildScreen>
    );
  }

  const question = questions[index]!;
  const language = languageName(question.card.subject);

  return (
    <ChildScreen style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        🎧 Écoute et choisis · {index + 1} sur {questions.length}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText style={learningTextStyle(settings)}>
          Écoute le mot en {language}, puis choisis ce qu’il veut dire.
        </ThemedText>
        <Button size="large" label="🔊 Écouter" onPress={() => speak(question)} />
        {answer ? (
          <ThemedText type="subtitle" style={styles.centerText}>
            {question.card.back}
          </ThemedText>
        ) : null}
      </ThemedView>
      <View style={styles.options}>
        {question.options.map((option) => (
          <Button
            key={option}
            variant={answer && option === question.card.front ? 'primary' : 'secondary'}
            label={option}
            disabled={answer !== null}
            onPress={() => {
              if (!round) setRound(questions);
              setAnswer(option);
              if (option === question.card.front) setScore((s) => s + 1);
            }}
          />
        ))}
      </View>
      {answer ? (
        <>
          <ThemedText accessibilityLiveRegion="polite" style={learningTextStyle(settings)}>
            {answer === question.card.front
              ? 'Bravo, c’est ça !'
              : `Pas tout à fait : c’était « ${question.card.front} ».`}
          </ThemedText>
          <Button
            label={index + 1 < questions.length ? 'Mot suivant' : 'Terminer'}
            onPress={() => {
              if (index + 1 >= questions.length) {
                const final = score;
                logPractice('ecoute', question.card.subject, final, questions.length);
              }
              setAnswer(null);
              setIndex((i) => i + 1);
            }}
          />
        </>
      ) : null}
      <Button variant="secondary" label="Arrêter" onPress={() => router.back()} />
    </ChildScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six, gap: Spacing.three },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.three },
  options: { gap: Spacing.two },
});
