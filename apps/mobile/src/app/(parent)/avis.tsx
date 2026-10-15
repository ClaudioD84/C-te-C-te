import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useSendFeedback, type FeedbackMood } from '@/features/feedback/api';

const MOODS = ['content', 'bof', 'bloque'] as const;
const MOOD_LABELS: Record<FeedbackMood, string> = {
  content: '😀 Ça me plaît',
  bof: '😐 Bof',
  bloque: '😣 Je suis bloqué',
};

/** Avis des familles (bêta) : lu par l'équipe, jamais transmis à l'IA. */
export default function FeedbackScreen() {
  const { depuis } = useLocalSearchParams<{ depuis?: string }>();
  const [mood, setMood] = useState<FeedbackMood | null>(null);
  const [message, setMessage] = useState('');
  const send = useSendFeedback();

  if (send.isSuccess) {
    return (
      <Screen>
        <ThemedText type="subtitle" accessibilityLiveRegion="polite">
          Merci ! 🙏
        </ThemedText>
        <ThemedText>Votre avis est bien arrivé. Nous lisons chaque message.</ThemedText>
        <Button label="Revenir" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText>
        Une idée, un souci, une incompréhension ? Dites-le-nous simplement : chaque avis nous aide à améliorer
        l’application.
      </ThemedText>
      <ChoiceChips
        label="Dans l’ensemble"
        options={MOODS}
        labels={MOOD_LABELS}
        selected={mood ? [mood] : []}
        onToggle={setMood}
      />
      <TextField
        label="Votre message"
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        placeholder="Par exemple : je n’ai pas trouvé comment…"
      />
      {depuis ? (
        <ThemedText type="small" themeColor="textSecondary">
          L’écran d’où vous écrivez est joint au message, pour nous aider à comprendre.
        </ThemedText>
      ) : null}
      {send.error ? (
        <ThemedText themeColor="danger" accessibilityRole="alert">
          {send.error.message}
        </ThemedText>
      ) : null}
      <Button
        label="Envoyer mon avis"
        disabled={message.trim().length === 0}
        loading={send.isPending}
        onPress={() => send.mutate({ message, mood, screen: depuis ?? null })}
      />
    </Screen>
  );
}
