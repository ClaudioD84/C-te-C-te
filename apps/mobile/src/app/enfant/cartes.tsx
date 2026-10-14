import {
  cardAnswers,
  checkAnswer,
  deriveLearningSettings,
  NEAR_MISS_MESSAGES,
  speechLanguage,
  type AnswerVerdict,
  type LearningSettings,
  type ReviewRating,
} from '@cote-a-cote/shared';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChildScreen } from '@/features/backgrounds/child-screen';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import {
  reviewCardVariables,
  useDueFlashcards,
  useReviewFlashcard,
  useTaskFlashcards,
} from '@/features/study/api';
import { useTheme } from '@/hooks/use-theme';

const SELF_RATINGS: { rating: ReviewRating; label: string }[] = [
  { rating: 'oublie', label: 'Je ne savais pas' },
  { rating: 'difficile', label: "C'était difficile" },
  { rating: 'facile', label: 'Facile !' },
];

/** Révision des cartes du jour (répétition espacée, F9) : l'enfant répond avant de voir la réponse. */
export default function FlashcardsScreen() {
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  // Révision express (veille d'une évaluation) : toutes les cartes de la tâche, une fois chacune.
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const due = useDueFlashcards(childId);
  const express = useTaskFlashcards(childId, taskId);
  const review = useReviewFlashcard(childId);
  const [reviewed, setReviewed] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const cards = taskId ? { ...express, data: express.data?.filter((c) => !seen.includes(c.id)) } : due;

  if (!child.data || cards.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const settings = deriveLearningSettings(child.data);
  const card = cards.data?.[0];

  if (!card) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText type="subtitle" style={styles.centerText}>
          {reviewed > 0
            ? `Bravo, ${reviewed} carte${reviewed > 1 ? 's' : ''} revue${reviewed > 1 ? 's' : ''} !`
            : taskId
              ? 'Pas de cartes pour cette évaluation.'
              : 'Aucune carte à revoir aujourd’hui.'}
        </ThemedText>
        <Button label="Retour à la mission" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <ChildScreen style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {card.study_pack.task.subject} · encore {cards.data!.length} carte{cards.data!.length > 1 ? 's' : ''}
      </ThemedText>
      <CardReview
        key={card.id}
        front={card.front}
        back={card.back}
        subject={card.study_pack.task.subject}
        settings={settings}
        onRated={(rating) => {
          // La carte quitte la pile tout de suite ; l'envoi suit, ou attend le réseau.
          review.mutate(reviewCardVariables(childId, card, rating));
          setReviewed((n) => n + 1);
          setSeen((ids) => [...ids, card.id]);
        }}
      />
      <Button variant="secondary" label="Arrêter pour aujourd'hui" onPress={() => router.back()} />
    </ChildScreen>
  );
}

/**
 * Une carte : réponse courte tapée et vérifiée (un essai de plus si c'est faux), sinon réponse écrite ou dite
 * à voix haute, puis comparée par l'enfant. La note de répétition espacée suit le résultat.
 */
function CardReview({
  front,
  back,
  subject,
  settings,
  onRated,
}: {
  front: string;
  back: string;
  subject: string;
  settings: LearningSettings;
  onRated: (rating: ReviewRating) => void;
}) {
  const theme = useTheme();
  const text = learningTextStyle(settings, 24);
  const answers = cardAnswers(back);
  const [typed, setTyped] = useState('');
  const [tries, setTries] = useState(0);
  const [verdict, setVerdict] = useState<AnswerVerdict | null>(null);
  const [revealed, setRevealed] = useState(false);
  const right = verdict?.result === 'juste';

  function check() {
    const result = checkAnswer(answers!, typed);
    setVerdict(result);
    setTries(tries + 1);
    // Deuxième essai manqué : la réponse s'affiche, la carte reviendra bientôt.
    if (result.result === 'juste' || tries + 1 >= 2) setRevealed(true);
  }

  const feedback = !verdict
    ? null
    : verdict.result === 'juste'
      ? 'Bravo, c’est juste !'
      : verdict.result === 'presque'
        ? NEAR_MISS_MESSAGES[verdict.nearMiss!]
        : revealed
          ? 'Ce n’est pas ça. Retiens bien la réponse : la carte reviendra bientôt.'
          : 'Pas encore. Essaie encore !';

  return (
    <View style={styles.review}>
      <ThemedView
        type={revealed ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.card}
        accessibilityLabel={revealed ? `Question : ${front}. Réponse : ${back}` : `Question : ${front}`}>
        <ThemedText type="small" themeColor="textSecondary">
          Question
        </ThemedText>
        <ThemedText testID="carte-question" style={[text, styles.centerText]}>
          {front}
        </ThemedText>
        {revealed ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Réponse
            </ThemedText>
            <ThemedText style={[text, styles.centerText, { color: theme.primary }]}>{back}</ThemedText>
          </>
        ) : null}
      </ThemedView>
      {/* Cartes de langue : le verso est lu dans la langue étudiée (accent belge pour le néerlandais). */}
      <Button
        variant="secondary"
        label="🔊 Écouter"
        accessibilityLabel={revealed ? 'Écouter la réponse' : 'Écouter la question'}
        onPress={() =>
          Speech.speak(revealed ? back : front, {
            language: revealed ? speechLanguage(subject) : 'fr-BE',
          })
        }
      />

      {!revealed || typed ? (
        <TextField
          label={answers ? 'Ta réponse' : 'Ta réponse (écris-la ou dis-la à voix haute)'}
          value={typed}
          onChangeText={(value) => {
            setTyped(value);
            if (!revealed) setVerdict(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          editable={!revealed}
          onSubmitEditing={answers && typed.trim() ? check : undefined}
          style={learningTextStyle(settings, 20)}
        />
      ) : null}
      {feedback ? (
        <ThemedText
          style={learningTextStyle(settings, 18)}
          themeColor={right ? undefined : 'warning'}
          accessibilityLiveRegion="polite">
          {feedback}
        </ThemedText>
      ) : null}

      {!revealed ? (
        answers ? (
          <View style={styles.row}>
            <Button label="Vérifier" style={styles.flex} disabled={!typed.trim()} onPress={check} />
            {tries > 0 ? (
              <Button
                variant="secondary"
                label="Voir la réponse"
                style={styles.flex}
                onPress={() => setRevealed(true)}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.row}>
            <Button
              label="Comparer avec la réponse"
              style={styles.flex}
              disabled={!typed.trim()}
              onPress={() => setRevealed(true)}
            />
            <Button
              variant="secondary"
              label="Je l’ai dite à voix haute"
              style={styles.flex}
              onPress={() => setRevealed(true)}
            />
          </View>
        )
      ) : !answers ? (
        // Réponse longue : l'enfant juge lui-même en comparant.
        <View style={styles.ratings}>
          {SELF_RATINGS.map(({ rating, label }) => (
            <Button
              key={rating}
              variant={rating === 'facile' ? 'primary' : 'secondary'}
              label={label}
              onPress={() => onRated(rating)}
            />
          ))}
        </View>
      ) : right && tries === 1 ? (
        <View style={styles.ratings}>
          <Button label="Facile !" onPress={() => onRated('facile')} />
          <Button variant="secondary" label="C'était difficile" onPress={() => onRated('difficile')} />
        </View>
      ) : (
        // Juste au deuxième essai ou presque : à revoir un peu plus tôt ; manquée : elle revient vite.
        <Button
          label="Carte suivante"
          onPress={() => onRated(right || verdict?.result === 'presque' ? 'difficile' : 'oublie')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six, gap: Spacing.three },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  review: { gap: Spacing.three },
  card: {
    minHeight: 220,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  ratings: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flex: { flexGrow: 1, flexBasis: 140 },
});
