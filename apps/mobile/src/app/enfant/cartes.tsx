import { deriveLearningSettings, type ReviewRating } from '@cote-a-cote/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { learningTextStyle } from '@/constants/fonts';
import { Spacing } from '@/constants/theme';
import { useChildMode } from '@/features/child-mode/child-mode-provider';
import { useChildProfile } from '@/features/profiles/api';
import { reviewCardVariables, useDueFlashcards, useReviewFlashcard } from '@/features/study/api';
import { useTheme } from '@/hooks/use-theme';

const RATINGS: { rating: ReviewRating; label: string }[] = [
  { rating: 'oublie', label: 'Je ne savais pas' },
  { rating: 'difficile', label: "C'était difficile" },
  { rating: 'facile', label: 'Facile !' },
];

/** Révision des cartes du jour (répétition espacée, F9). */
export default function FlashcardsScreen() {
  const theme = useTheme();
  const { activeChildId } = useChildMode();
  const childId = activeChildId ?? '';
  const child = useChildProfile(childId);
  const cards = useDueFlashcards(childId);
  const review = useReviewFlashcard(childId);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  if (!child.data || cards.isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const settings = deriveLearningSettings(child.data);
  const text = learningTextStyle(settings, 24);
  const card = cards.data?.[0];

  if (!card) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText type="subtitle" style={styles.centerText}>
          {reviewed > 0
            ? `Bravo, ${reviewed} carte${reviewed > 1 ? 's' : ''} revue${reviewed > 1 ? 's' : ''} !`
            : 'Aucune carte à revoir aujourd’hui.'}
        </ThemedText>
        <Button label="Retour à la mission" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {card.study_pack.task.subject} · encore {cards.data!.length} carte{cards.data!.length > 1 ? 's' : ''}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          flipped ? `Réponse : ${card.back}` : `Question : ${card.front}. Touche pour voir la réponse.`
        }
        onPress={() => setFlipped(!flipped)}
        style={[
          styles.card,
          { backgroundColor: flipped ? theme.backgroundSelected : theme.backgroundElement },
        ]}>
        <ThemedText type="small" themeColor="textSecondary">
          {flipped ? 'Réponse' : 'Question'}
        </ThemedText>
        <ThemedText style={[text, styles.centerText]}>{flipped ? card.back : card.front}</ThemedText>
        {!flipped ? (
          <ThemedText type="small" themeColor="textSecondary">
            Touche la carte pour voir la réponse
          </ThemedText>
        ) : null}
      </Pressable>
      {flipped ? (
        <View style={styles.ratings}>
          {RATINGS.map(({ rating, label }) => (
            <Button
              key={rating}
              variant={rating === 'facile' ? 'primary' : 'secondary'}
              label={label}
              onPress={() => {
                // La carte quitte la pile tout de suite ; l'envoi suit, ou attend le réseau.
                review.mutate(reviewCardVariables(childId, card, rating));
                setFlipped(false);
                setReviewed((n) => n + 1);
              }}
            />
          ))}
        </View>
      ) : null}
      <Button variant="secondary" label="Arrêter pour aujourd'hui" onPress={() => router.back()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, paddingTop: Spacing.six, gap: Spacing.three },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  card: {
    minHeight: 260,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  ratings: { gap: Spacing.two },
});
